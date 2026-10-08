export interface Paper {
  id: string;
  title: string;
  subject: string;
  year: number;
  type: 'past-paper' | 'specific-paper';
  term?: string;
  downloadUrl: string;
  requiresCode?: boolean;
  accessCode?: string;
}
