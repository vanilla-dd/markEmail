import { auth } from "@/auth";
import Image from "next/image";

export default async function UserData() {
  const session = await auth();

  if (!session?.user) return null;

  return (
    <div>
      Name:{session.user.name}
      email:{session.user.email}
      <Image
        src={session.user.image ?? ""}
        alt="Profile Picture"
        width={100}
        height={100}
      />
    </div>
  );
}
