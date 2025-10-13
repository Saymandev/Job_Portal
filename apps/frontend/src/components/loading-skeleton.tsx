import { Card, CardContent, CardHeader } from './ui/card';

export function JobCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
            <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
            <div className="h-6 bg-muted rounded-full w-20 animate-pulse" />
          </div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-16 animate-pulse mb-2" />
        <div className="h-3 bg-muted rounded w-32 animate-pulse" />
      </CardContent>
    </Card>
  );
}

