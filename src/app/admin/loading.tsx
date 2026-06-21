import { SkeletonPage } from "@/components/Skeleton";
import AppLayout from "@/components/AppLayout";

export default function AdminLoading() {
  return (
    <AppLayout>
      <SkeletonPage variant="stat" />
    </AppLayout>
  );
}
