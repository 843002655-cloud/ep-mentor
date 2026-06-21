import { SkeletonPage } from "@/components/Skeleton";
import AppLayout from "@/components/AppLayout";

export default function CasesLoading() {
  return (
    <AppLayout>
      <SkeletonPage variant="case" count={6} />
    </AppLayout>
  );
}
