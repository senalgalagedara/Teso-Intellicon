from typing import List, Dict, Any, Optional
from app.db import get_db_connection
from app.engine.algorithms.item_stats import analyze_item
from app.engine.algorithms.zscore import (
    compute_subject_zscores, 
    project_composite_zscore_monte_carlo, 
    flag_student_zscores
)

async def get_course_item_stats(course_id: str) -> List[Dict[str, Any]]:
    """
    Computes facility, discrimination, and diagnostic flags for all questions in a course.
    """
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            # 1. Fetch questions for this course
            await cur.execute(
                """
                SELECT id, stem, correct_option
                FROM app.questions
                WHERE course_id = %s
                ORDER BY created_at ASC
                """,
                (course_id,)
            )
            questions = await cur.fetchall()

            # 2. Fetch attempts with student ability / assessment score for discrimination
            await cur.execute(
                """
                SELECT a.question_id, a.chosen_option, a.is_correct,
                       coalesce(s.theta, 0.0) as ability_score
                FROM app.attempts a
                JOIN app.questions q ON q.id = a.question_id
                LEFT JOIN engine.student_ability s ON (s.student_id = a.student_id AND s.subject_id = q.subject_id)
                WHERE a.course_id = %s
                """,
                (course_id,)
            )
            all_attempts = await cur.fetchall()

    attempts_by_q: Dict[str, List[Dict[str, Any]]] = {}
    for att in all_attempts:
        qid = str(att["question_id"])
        attempts_by_q.setdefault(qid, []).append(att)

    results = []
    for q in questions:
        qid = str(q["id"])
        q_attempts = attempts_by_q.get(qid, [])
        stats = analyze_item(q_attempts, q["correct_option"])
        results.append({
            "question_id": qid,
            "stem": q["stem"],
            "facility": stats["facility"],
            "discrimination": stats["discrimination"],
            "attempts_count": stats["attempts_count"],
            "flags": stats["flags"]
        })

    return results

async def get_course_zscores(
    course_id: str, 
    linked_course_ids: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Computes cohort Z-scores and Monte Carlo composite projections.
    Crucial security rule: verifies that any linked courses have an 'approved' status in app.course_links.
    """
    valid_courses = [course_id]

    if linked_course_ids:
        async with get_db_connection() as conn:
            async with conn.cursor() as cur:
                # Validate course_links consent
                await cur.execute(
                    """
                    SELECT course_a, course_b
                    FROM app.course_links
                    WHERE status = 'approved' AND (
                        (course_a = %s AND course_b = ANY(%s)) OR
                        (course_b = %s AND course_a = ANY(%s))
                    )
                    """,
                    (course_id, linked_course_ids, course_id, linked_course_ids)
                )
                approved_links = await cur.fetchall()
                for link in approved_links:
                    other_id = str(link["course_b"]) if str(link["course_a"]) == course_id else str(link["course_a"])
                    if other_id not in valid_courses:
                        valid_courses.append(other_id)

    # Load students and scores/thetas across valid_courses
    async with get_db_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT c.id as course_id, c.title as course_title,
                       s.id as student_id, u.email as student_email,
                       coalesce(sa.theta, avg(sc.score) / 100.0 * 4.0 - 2.0, 0.0) as subject_score
                FROM app.enrollments e
                JOIN app.courses c ON c.id = e.course_id
                JOIN neon_auth."user" u ON u.id = e.student_id
                JOIN neon_auth."user" s ON s.id = e.student_id
                LEFT JOIN engine.student_ability sa ON (sa.student_id = e.student_id AND sa.subject_id = c.subject_id)
                LEFT JOIN app.assessments a ON a.course_id = c.id
                LEFT JOIN app.assessment_scores sc ON (sc.assessment_id = a.id AND sc.student_id = e.student_id)
                WHERE e.course_id = ANY(%s) AND e.status = 'accepted'
                GROUP BY c.id, c.title, s.id, u.email, sa.theta
                """,
                (valid_courses,)
            )
            rows = await cur.fetchall()

    if not rows:
        return []

    # Organize by subject/course
    by_course: Dict[str, Dict[str, float]] = {} # course_title -> {student_id: score}
    student_meta: Dict[str, Dict[str, str]] = {}

    for r in rows:
        sid = str(r["student_id"])
        c_title = r["course_title"]
        student_meta[sid] = {
            "email": r["student_email"],
            "name": r["student_email"].split("@")[0]
        }
        by_course.setdefault(c_title, {})[sid] = float(r["subject_score"] or 0.0)

    # Compute Z-score per course/subject
    z_per_course: Dict[str, Dict[str, float]] = {}
    stats_per_course: Dict[str, tuple] = {}
    for c_title, score_map in by_course.items():
        z_res = compute_subject_zscores(score_map)
        z_per_course[c_title] = {sid: data[0] for sid, data in z_res.items()}
        # Use mean and std for Monte Carlo
        sample_sid = next(iter(z_res)) if z_res else None
        if sample_sid:
            stats_per_course[c_title] = (z_res[sample_sid][1], z_res[sample_sid][2])

    # Compute student composite and run Monte Carlo bands
    all_student_ids = set(student_meta.keys())
    student_composites: Dict[str, float] = {}
    student_records = []

    for sid in all_student_ids:
        subject_z_map = {}
        for c_title in by_course:
            if sid in z_per_course[c_title]:
                subject_z_map[c_title] = z_per_course[c_title][sid]

        if subject_z_map:
            comp_z = sum(subject_z_map.values()) / len(subject_z_map)
        else:
            comp_z = 0.0
        student_composites[sid] = comp_z

        # Monte Carlo projection band
        band = project_composite_zscore_monte_carlo(stats_per_course, n_samples=1000)

        student_records.append({
            "student_id": sid,
            "student_name": student_meta[sid]["name"],
            "student_email": student_meta[sid]["email"],
            "subject_z": subject_z_map,
            "composite_z": round(comp_z, 3),
            "band": band
        })

    # Find cohort top 1% threshold
    all_composites = sorted(student_composites.values(), reverse=True)
    top_1_idx = max(0, int(len(all_composites) * 0.01))
    top_1_cutoff = all_composites[top_1_idx] if all_composites else 1.5

    for rec in student_records:
        rec["flags"] = flag_student_zscores(
            composite_p50=rec["band"]["p50"],
            composite_p90=rec["band"]["p90"],
            subject_z_map=rec["subject_z"],
            cohort_top_1_threshold=top_1_cutoff
        )

    # Sort descending by composite Z
    student_records.sort(key=lambda x: x["composite_z"], reverse=True)
    return student_records
