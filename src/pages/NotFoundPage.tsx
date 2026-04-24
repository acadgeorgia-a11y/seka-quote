import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container max-w-6xl py-20 text-center">
      <h1 className="font-serif text-5xl tracking-tight2 mb-2">Not found</h1>
      <p className="text-muted-foreground mb-6">That page doesn't exist.</p>
      <Button asChild variant="outline">
        <Link to="/new-quote">Back to calculator</Link>
      </Button>
    </div>
  );
}
