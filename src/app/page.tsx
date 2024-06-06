import { SignIn } from "@/components/sign-in";
import UserData from "./showUserData";
import { SignOut } from "@/components/sign-out";

export default function Home() {
  return (
    <>
      <SignIn />;
      <UserData />
      <SignOut />
    </>
  );
}
