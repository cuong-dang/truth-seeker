import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Container, Heading } from "@radix-ui/themes";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const googleAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });
  if (googleAccount) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  return (
    <Container size="1" py="9">
      <Heading size="6" mb="6">Settings</Heading>
      <SettingsForm
        initialName={user?.name ?? ""}
        initialImage={user?.image ?? null}
      />
    </Container>
  );
}
