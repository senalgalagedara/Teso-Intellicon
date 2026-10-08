export interface Task {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
    color?: string;
    description?: string;
    zoomLink?: string;
    teamsLink?: string;
    meetLink?: string;
}
