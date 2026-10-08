import { PaperCard } from './PaperCard';
import type { Paper } from '@/types/exams';
import { FileX } from 'lucide-react';

interface PaperGridProps {
  papers: Paper[];
}

export function PaperGrid({ papers }: PaperGridProps) {
  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
        <div className="bg-muted p-4 md:p-6 rounded-full mb-4">
          <FileX className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />
        </div>
        <h3 className="text-foreground mb-2 font-medium text-lg">No papers found</h3>
        <p className="text-muted-foreground text-sm md:text-base">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {papers.map(paper => (
        <PaperCard key={paper.id} paper={paper} />
      ))}
    </div>
  );
}