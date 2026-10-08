import copy
from typing import List, Optional
import pandas as pd

from app.models.study_plan import PlanInput, DayPlan, LessonItem, PlanResult

# ===========================================================
# Full Chemistry A/L lesson dataset (from uwillneverknow.py)
# Keys: unit, id, est_time, lesson_time, syllabus_p, total_syl,
#       mcq, mcq_wt, mcq_time, part_wt, p2_time, total_time_cost
# ===========================================================
ALL_LESSONS_DATA = [
    {'unit': 1, 'id': 1.1, 'est_time': 1.03, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.53},
    {'unit': 1, 'id': 1.2, 'est_time': 1.03, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.53},
    {'unit': 1, 'id': 1.3, 'est_time': 1.03, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.53},
    {'unit': 1, 'id': 1.4, 'est_time': 1.03, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.53},
    {'unit': 1, 'id': 1.5, 'est_time': 0.91, 'lesson_time': 24.01, 'syllabus_p': 0.67, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.41},
    {'unit': 1, 'id': 1.6, 'est_time': 0.91, 'lesson_time': 24.01, 'syllabus_p': 0.67, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.41},
    {'unit': 1, 'id': 1.7, 'est_time': 0.91, 'lesson_time': 24.01, 'syllabus_p': 0.67, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 8.41},
    {'unit': 1, 'id': 1.8, 'est_time': 2.06, 'lesson_time': 24.01, 'syllabus_p': 1.5, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 9.56},
    {'unit': 1, 'id': 1.9, 'est_time': 2.06, 'lesson_time': 24.01, 'syllabus_p': 1.5, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 9.56},
    {'unit': 1, 'id': 1.10, 'est_time': 2.06, 'lesson_time': 24.01, 'syllabus_p': 1.5, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 9.56},
    {'unit': 1, 'id': 1.11, 'est_time': 2.06, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 9.56},
    {'unit': 1, 'id': 1.12, 'est_time': 2.06, 'lesson_time': 24.01, 'syllabus_p': 1.0, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 9.56},
    {'unit': 1, 'id': 1.13, 'est_time': 3.43, 'lesson_time': 24.01, 'syllabus_p': 1.67, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 10.93},
    {'unit': 1, 'id': 1.14, 'est_time': 3.43, 'lesson_time': 24.01, 'syllabus_p': 1.67, 'total_syl': 5.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.25, 'part_wt': 94.0, 'p2_time': 6.25, 'total_time_cost': 10.93},
    {'unit': 2, 'id': 2.1, 'est_time': 2.06, 'lesson_time': 24.0, 'syllabus_p': 2.0, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.31},
    {'unit': 2, 'id': 2.2, 'est_time': 2.06, 'lesson_time': 24.0, 'syllabus_p': 2.0, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.31},
    {'unit': 2, 'id': 2.3, 'est_time': 2.06, 'lesson_time': 24.0, 'syllabus_p': 2.0, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.31},
    {'unit': 2, 'id': 2.4, 'est_time': 2.06, 'lesson_time': 24.0, 'syllabus_p': 2.0, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.31},
    {'unit': 2, 'id': 2.5, 'est_time': 2.74, 'lesson_time': 24.0, 'syllabus_p': 2.67, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.99},
    {'unit': 2, 'id': 2.6, 'est_time': 2.74, 'lesson_time': 24.0, 'syllabus_p': 2.67, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.99},
    {'unit': 2, 'id': 2.7, 'est_time': 2.74, 'lesson_time': 24.0, 'syllabus_p': 2.67, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.99},
    {'unit': 2, 'id': 2.8, 'est_time': 2.74, 'lesson_time': 24.0, 'syllabus_p': 2.67, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.99},
    {'unit': 2, 'id': 2.9, 'est_time': 2.4, 'lesson_time': 24.0, 'syllabus_p': 2.33, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.65},
    {'unit': 2, 'id': 2.10, 'est_time': 2.4, 'lesson_time': 24.0, 'syllabus_p': 2.33, 'total_syl': 5.84, 'mcq': 5, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.65},
    {'unit': 3, 'id': 3.1, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.2, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.3, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.4, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.5, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.6, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.7, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.8, 'est_time': 2.33, 'lesson_time': 28.0, 'syllabus_p': 2.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.58},
    {'unit': 3, 'id': 3.9, 'est_time': 2.1, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.35},
    {'unit': 3, 'id': 3.10, 'est_time': 2.1, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.35},
    {'unit': 3, 'id': 3.11, 'est_time': 2.1, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.35},
    {'unit': 3, 'id': 3.12, 'est_time': 2.1, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 6.25, 'total_time_cost': 10.35},
    {'unit': 4, 'id': 4.1, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 1.17, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.2, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 1.17, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.3, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 1.17, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.4, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 1.17, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.5, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 2.0, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.6, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 2.0, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.7, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 2.0, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.8, 'est_time': 2.29, 'lesson_time': 20.0, 'syllabus_p': 2.0, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.54},
    {'unit': 4, 'id': 4.9, 'est_time': 1.84, 'lesson_time': 20.0, 'syllabus_p': 1.33, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.09},
    {'unit': 4, 'id': 4.10, 'est_time': 1.84, 'lesson_time': 20.0, 'syllabus_p': 1.33, 'total_syl': 4.38, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 6.25, 'total_time_cost': 9.09},
    {'unit': 5, 'id': 5.1, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 1.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.2, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 1.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.3, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 1.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.4, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 1.33, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.5, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.6, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.7, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.8, 'est_time': 3.11, 'lesson_time': 28.0, 'syllabus_p': 2.17, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.86},
    {'unit': 5, 'id': 5.9, 'est_time': 3.14, 'lesson_time': 28.0, 'syllabus_p': 1.34, 'total_syl': 6.84, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 18.89},
    {'unit': 6, 'id': 6.1, 'est_time': 28.19, 'lesson_time': 38.77, 'syllabus_p': 10.17, 'total_syl': 14.12, 'mcq': 6, 'mcq_wt': 12.0, 'mcq_time': 3.0, 'part_wt': 88.0, 'p2_time': 21.25, 'total_time_cost': 52.44},
    {'unit': 6, 'id': 6.2, 'est_time': 9.62, 'lesson_time': 38.77, 'syllabus_p': 3.17, 'total_syl': 14.12, 'mcq': 6, 'mcq_wt': 12.0, 'mcq_time': 3.0, 'part_wt': 88.0, 'p2_time': 21.25, 'total_time_cost': 33.87},
    {'unit': 6, 'id': 6.3, 'est_time': 0.48, 'lesson_time': 38.77, 'syllabus_p': 0.17, 'total_syl': 14.12, 'mcq': 6, 'mcq_wt': 12.0, 'mcq_time': 3.0, 'part_wt': 88.0, 'p2_time': 21.25, 'total_time_cost': 24.73},
    {'unit': 6, 'id': 6.4, 'est_time': 0.48, 'lesson_time': 38.77, 'syllabus_p': 0.17, 'total_syl': 14.12, 'mcq': 6, 'mcq_wt': 12.0, 'mcq_time': 3.0, 'part_wt': 88.0, 'p2_time': 21.25, 'total_time_cost': 24.73},
    {'unit': 7, 'id': 7.1, 'est_time': 0.85, 'lesson_time': 2.55, 'syllabus_p': 2.0, 'total_syl': 2.8, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.35},
    {'unit': 7, 'id': 7.2, 'est_time': 0.85, 'lesson_time': 2.55, 'syllabus_p': 2.0, 'total_syl': 2.8, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.35},
    {'unit': 7, 'id': 7.3, 'est_time': 0.85, 'lesson_time': 2.55, 'syllabus_p': 2.0, 'total_syl': 2.8, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.35},
    {'unit': 8, 'id': 8.1, 'est_time': 2.46, 'lesson_time': 2.46, 'syllabus_p': 7.7, 'total_syl': 7.7, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 10.96},
    {'unit': 9, 'id': 9.1, 'est_time': 2.46, 'lesson_time': 9.84, 'syllabus_p': 7.7, 'total_syl': 7.7, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 7.5, 'total_time_cost': 11.46},
    {'unit': 9, 'id': 9.2, 'est_time': 2.46, 'lesson_time': 9.84, 'syllabus_p': 7.7, 'total_syl': 7.7, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 7.5, 'total_time_cost': 11.46},
    {'unit': 9, 'id': 9.3, 'est_time': 2.46, 'lesson_time': 9.84, 'syllabus_p': 7.7, 'total_syl': 7.7, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 7.5, 'total_time_cost': 11.46},
    {'unit': 9, 'id': 9.4, 'est_time': 2.46, 'lesson_time': 9.84, 'syllabus_p': 7.7, 'total_syl': 7.7, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 7.5, 'total_time_cost': 11.46},
    {'unit': 10, 'id': 10.1, 'est_time': 0.69, 'lesson_time': 2.07, 'syllabus_p': 2.3, 'total_syl': 2.3, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.19},
    {'unit': 10, 'id': 10.2, 'est_time': 0.69, 'lesson_time': 2.07, 'syllabus_p': 2.3, 'total_syl': 2.3, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.19},
    {'unit': 10, 'id': 10.3, 'est_time': 0.69, 'lesson_time': 2.07, 'syllabus_p': 2.3, 'total_syl': 2.3, 'mcq': 2, 'mcq_wt': 4.0, 'mcq_time': 1.0, 'part_wt': 96.0, 'p2_time': 7.5, 'total_time_cost': 9.19},
    {'unit': 11, 'id': 11.1, 'est_time': 9.56, 'lesson_time': 28.0, 'syllabus_p': 4.67, 'total_syl': 6.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 13.75, 'total_time_cost': 24.81},
    {'unit': 11, 'id': 11.2, 'est_time': 9.56, 'lesson_time': 28.0, 'syllabus_p': 4.67, 'total_syl': 6.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 13.75, 'total_time_cost': 24.81},
    {'unit': 11, 'id': 11.3, 'est_time': 2.96, 'lesson_time': 28.0, 'syllabus_p': 1.44, 'total_syl': 6.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 13.75, 'total_time_cost': 18.21},
    {'unit': 11, 'id': 11.4, 'est_time': 2.96, 'lesson_time': 28.0, 'syllabus_p': 1.44, 'total_syl': 6.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 13.75, 'total_time_cost': 18.21},
    {'unit': 11, 'id': 11.5, 'est_time': 2.96, 'lesson_time': 28.0, 'syllabus_p': 1.44, 'total_syl': 6.84, 'mcq': 3, 'mcq_wt': 6.0, 'mcq_time': 1.5, 'part_wt': 94.0, 'p2_time': 13.75, 'total_time_cost': 18.21},
    {'unit': 12, 'id': 12.1, 'est_time': 12.94, 'lesson_time': 64.01, 'syllabus_p': 6.33, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 30.19},
    {'unit': 12, 'id': 12.2, 'est_time': 12.94, 'lesson_time': 64.01, 'syllabus_p': 6.33, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 30.19},
    {'unit': 12, 'id': 12.3, 'est_time': 12.94, 'lesson_time': 64.01, 'syllabus_p': 6.33, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 30.19},
    {'unit': 12, 'id': 12.4, 'est_time': 4.09, 'lesson_time': 64.01, 'syllabus_p': 2.0, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 21.34},
    {'unit': 12, 'id': 12.5, 'est_time': 4.09, 'lesson_time': 64.01, 'syllabus_p': 2.0, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 21.34},
    {'unit': 12, 'id': 12.6, 'est_time': 5.67, 'lesson_time': 64.01, 'syllabus_p': 2.77, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 22.92},
    {'unit': 12, 'id': 12.7, 'est_time': 5.67, 'lesson_time': 64.01, 'syllabus_p': 2.77, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 22.92},
    {'unit': 12, 'id': 12.8, 'est_time': 5.67, 'lesson_time': 64.01, 'syllabus_p': 2.77, 'total_syl': 15.58, 'mcq': 7, 'mcq_wt': 14.0, 'mcq_time': 3.5, 'part_wt': 86.0, 'p2_time': 13.75, 'total_time_cost': 22.92},
    {'unit': 13, 'id': 13.1, 'est_time': 4.61, 'lesson_time': 38.0, 'syllabus_p': 1.12, 'total_syl': 9.24, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 20.36},
    {'unit': 13, 'id': 13.2, 'est_time': 24.18, 'lesson_time': 38.0, 'syllabus_p': 5.88, 'total_syl': 9.24, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 39.93},
    {'unit': 13, 'id': 13.3, 'est_time': 9.21, 'lesson_time': 38.0, 'syllabus_p': 2.24, 'total_syl': 9.24, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 13.75, 'total_time_cost': 24.96},
    {'unit': 14, 'id': 14.1, 'est_time': 15.57, 'lesson_time': 44.0, 'syllabus_p': 3.79, 'total_syl': 10.72, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 15.0, 'total_time_cost': 32.57},
    {'unit': 14, 'id': 14.2, 'est_time': 13.54, 'lesson_time': 44.0, 'syllabus_p': 3.3, 'total_syl': 10.72, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 15.0, 'total_time_cost': 30.54},
    {'unit': 14, 'id': 14.3, 'est_time': 14.89, 'lesson_time': 44.0, 'syllabus_p': 3.63, 'total_syl': 10.72, 'mcq': 4, 'mcq_wt': 8.0, 'mcq_time': 2.0, 'part_wt': 92.0, 'p2_time': 15.0, 'total_time_cost': 31.89},
]

# Column index mapping for numpy array (matches dict order above)
COL = {
    'unit': 0, 'id': 1, 'est_time': 2, 'lesson_time': 3,
    'syllabus_p': 4, 'total_syl': 5, 'mcq': 6, 'mcq_wt': 7,
    'mcq_time': 8, 'part_wt': 9, 'p2_time': 10, 'total_time_cost': 11
}


def compute_study_plan(plan_input: PlanInput) -> PlanResult:
    months = plan_input.months
    hours = plan_input.hours_per_day
    off_days = plan_input.off_days

    # --- Core calculations (same as uwillneverknow.py) ---
    days = (months * 30) - (off_days * 4)
    hours_per_subject_day = hours / 3        
    total_hours_subject = days * hours_per_subject_day

    # Filter out skipped/puluwn lessons
    skip_set = set(plan_input.skipped_lesson_ids)
    filtered = [x for x in ALL_LESSONS_DATA if x['id'] not in skip_set]

    df = pd.DataFrame(filtered)

    df_sorted_by_weight = df.sort_values(
        by=['syllabus_p', 'total_syl', 'mcq_wt', 'part_wt'],
        ascending=True
    ).reset_index(drop=True)

    df_sorted_by_time = df.sort_values(
        by=['est_time', 'lesson_time', 'mcq_time', 'p2_time'],
        ascending=True
    ).reset_index(drop=True)

    # Select lessons that fit in total study hours
    lessonplan_lesson_list = []
    time_acc = 0.0
    i = 0
    while i < len(df_sorted_by_time) and time_acc + df_sorted_by_time.iloc[i]['total_time_cost'] <= total_hours_subject:
        time_acc += df_sorted_by_time.iloc[i]['total_time_cost']
        lessonplan_lesson_list.append(df_sorted_by_weight.iloc[i].to_dict())
        i += 1

    if not lessonplan_lesson_list:
        # If nothing fits (very short time), just take the first cheapest lesson
        lessonplan_lesson_list = [df_sorted_by_time.iloc[0].to_dict()]

    # --- Day-wise plan (same logic as uwillneverknow.py) ---
    divident_no = len(lessonplan_lesson_list) / days

    copy_lesson = copy.deepcopy(lessonplan_lesson_list)
    copy_mcq = copy.deepcopy(lessonplan_lesson_list)
    copy_p2 = copy.deepcopy(lessonplan_lesson_list)

    l, m, p = 0, 0, 0
    lesson_cumulative = 0.0
    mcq_cumulative = 0.0
    p2_cumulative = 0.0

    daily_plan: List[DayPlan] = []

    for day_num in range(1, days + 1):
        tot_day = 0.0

        lesson_unit = lesson_id = lesson_tc = None
        mcq_unit = mcq_id = mcq_tc = None
        p2_unit = p2_id = p2_tc = None

        if l < len(copy_lesson):
            lessontot = copy_lesson[l]['lesson_time'] * divident_no
            lesson_unit = int(copy_lesson[l]['unit'])
            lesson_id = float(copy_lesson[l]['id'])
            lesson_tc = round(lessontot, 4)
            tot_day += lessontot
            lesson_cumulative += lessontot
            if lesson_cumulative >= copy_lesson[l]['lesson_time']:
                lesson_cumulative = 0.0
                l += 1

        if m < len(copy_mcq):
            mcqtot = copy_mcq[m]['mcq_time'] * divident_no
            mcq_unit = int(copy_mcq[m]['unit'])
            mcq_id = float(copy_mcq[m]['id'])
            mcq_tc = round(mcqtot, 4)
            tot_day += mcqtot
            mcq_cumulative += mcqtot
            if mcq_cumulative >= copy_mcq[m]['mcq_time']:
                mcq_cumulative = 0.0
                m += 1

        if p < len(copy_p2):
            p2tot = copy_p2[p]['p2_time'] * divident_no
            p2_unit = int(copy_p2[p]['unit'])
            p2_id = float(copy_p2[p]['id'])
            p2_tc = round(p2tot, 4)
            tot_day += p2tot
            p2_cumulative += p2tot
            if p2_cumulative >= copy_p2[p]['p2_time']:
                p2_cumulative = 0.0
                p += 1

        daily_plan.append(DayPlan(
            day=day_num,
            lesson_unit=lesson_unit,
            lesson_id=lesson_id,
            lesson_time_cost=lesson_tc,
            mcq_unit=mcq_unit,
            mcq_id=mcq_id,
            mcq_time_cost=mcq_tc,
            p2_unit=p2_unit,
            p2_id=p2_id,
            p2_time_cost=p2_tc,
            total_day_time=round(tot_day, 4),
        ))

    lessons_in_plan = [LessonItem(**l) for l in lessonplan_lesson_list]

    return PlanResult(
        user_id=plan_input.user_id,
        months=months,
        hours_per_day=hours,
        off_days=off_days,
        total_days=days,
        total_hours=round(total_hours_subject, 4),
        lessons_in_plan=lessons_in_plan,
        daily_plan=daily_plan,
    )
