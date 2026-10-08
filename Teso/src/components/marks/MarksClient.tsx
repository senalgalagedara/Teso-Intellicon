"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TermTestGraphs } from "@/components/marks/TermTestGraphs";
import { TuitionExams } from "@/components/marks/TuitionExams";
import { ModelPastPapers } from "@/components/marks/ModelPastPapers";
import { getUserPastPapers, getPapersForSubjects } from "@/app/actions/exam";
import type { TuitionExam, ModelPaper } from "@/types/marks";

interface MarksClientProps {
  user: {
    id: string;
    subjects?: string[];
  };
  initialTermTests: any[];
  initialTuitionExams: TuitionExam[];
}

export function MarksClient({ user, initialTermTests, initialTuitionExams }: MarksClientProps) {
    const [tuitionExams, setTuitionExams] = useState<TuitionExam[]>(initialTuitionExams || []);
    const [modelPapers, setModelPapers] = useState<ModelPaper[]>([]);

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                const userPapers = await getUserPastPapers(user.id);
                const subjectPapers = user.subjects && user.subjects.length > 0
                    ? await getPapersForSubjects(user.subjects)
                    : [];

                const mappedUserPapers = Array.isArray(userPapers) ? (userPapers as ModelPaper[]) : [];

                const mappedSubjectPapers = (subjectPapers || []).map((p: any) => ({
                    id: p.id,
                    type: 'past' as const,
                    year: p.year,
                    subject: p.subject,
                    date: `${p.year}-01-01`,
                    parts: [ { id: `${p.id}-part-1`, name: 'Part 1', marks: 0, totalMarks: 0 } ],
                    totalMarks: 0,
                    obtainedMarks: 0,
                }));

                const existingIds = new Set(mappedUserPapers.map(p => p.id));
                const merged = [ ...mappedUserPapers, ...mappedSubjectPapers.filter((p:any) => !existingIds.has(p.id)) ];
                setModelPapers(merged);
            } catch (err) {
                console.error('Failed to load past papers:', err);
            }
        };

        fetchPapers();
    }, [user.id, user.subjects]);

    return (
        <Tabs defaultValue="term-tests" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-8 bg-card dark:bg-[#0F172A] border border-border dark:border-slate-800 p-1.5 rounded-full h-auto shadow-xs">
                <TabsTrigger 
                    value="term-tests" 
                    className="py-2.5 rounded-full font-bold text-xs md:text-sm text-muted-foreground data-[state=active]:bg-[#0070BA] dark:data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                    Term Tests
                </TabsTrigger>
                <TabsTrigger 
                    value="tuition" 
                    className="py-2.5 rounded-full font-bold text-xs md:text-sm text-muted-foreground data-[state=active]:bg-[#0070BA] dark:data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                    Tuition Exams
                </TabsTrigger>
                <TabsTrigger 
                    value="papers" 
                    className="py-2.5 rounded-full font-bold text-xs md:text-sm text-muted-foreground data-[state=active]:bg-[#0070BA] dark:data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-xs transition-all cursor-pointer"
                >
                    Model & Past Papers
                </TabsTrigger>
            </TabsList>

            <TabsContent value="term-tests" className="outline-none">
                <TermTestGraphs 
                    initialData={initialTermTests} 
                    userId={user.id}
                    userSubjects={user.subjects || []}
                />
            </TabsContent>

            <TabsContent value="tuition" className="outline-none">
                <TuitionExams
                    tuitionExams={tuitionExams}
                    setTuitionExams={setTuitionExams}
                    userSubjects={user.subjects || []}
                    userId={user.id}
                />
            </TabsContent>

            <TabsContent value="papers" className="outline-none">
                <ModelPastPapers
                    modelPapers={modelPapers}
                    setModelPapers={setModelPapers}
                    userSubjects={user.subjects}
                    userId={user.id}
                />
            </TabsContent>
        </Tabs>
    );
}