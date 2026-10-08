export interface TermTestMark {
    year: number;
    term: number;
    subject: string;
    marks: number;
    totalMarks: number;
}

export interface TuitionExam {
    id: string;
    date: string;
    subject: string;
    marks: number;
    totalMarks: number;
}

export interface PaperPart {
    id: string;
    name: string;
    marks: number;
    totalMarks: number;
}

export interface ModelPaper {
    id: string;
    type: "model" | "past";
    year: number;
    subject: string;
    date: string;
    parts: PaperPart[];
    totalMarks: number;
    obtainedMarks: number;
}
