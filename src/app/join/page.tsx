import { JoinFlow } from "@/components/join/JoinFlow";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return <JoinFlow initialCode={code ?? ""} />;
}
