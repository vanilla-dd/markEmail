// app/api/gmail/route.js
import { google } from "googleapis";
import { db } from "@/db/index";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

interface Session {
  user?: {
    id?: string;
  };
}

const getAccessToken = async (userId: string): Promise<string | null> => {
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  if (account && account[0]?.access_token) {
    return String(account[0].access_token);
  }
  return null;
};

const fetchEmailMessages = async (authClient: any) => {
  const gmail = google.gmail({ version: "v1", auth: authClient });
  const messages = await gmail.users.messages.list({ userId: "me" });

  const messageIds = messages.data.messages?.map((message: any) => message.id);
  if (!messageIds) return [];

  const limitedMessageIds = messageIds.slice(0, 10);

  const emails = await Promise.all(
    limitedMessageIds.map(async (messageId: string) => {
      const message = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
      });
      return message.data;
    })
  );

  return emails;
};

const parseEmailData = (emails: any[]) => {
  return emails
    .map((email) => {
      if (!email) return null;
      const snippet = email.snippet;
      const bodyData =
        email.payload?.parts?.map((part: any) => part.body?.data) || [];
      const decodedBodyData = bodyData[0]
        ? Buffer.from(bodyData[0], "base64").toString("ascii")
        : "";

      return {
        snippet,
        emailData: decodedBodyData,
      };
    })
    .filter(Boolean);
};

export async function GET() {
  try {
    const session: Session | null = await auth();

    if (!session || !session.user?.id) {
      return new Response("Unauthorized");
    }

    const accessToken = await getAccessToken(session.user.id);

    if (!accessToken) {
      return new Response("No access token found");
    }

    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });

    const emails = await fetchEmailMessages(authClient);
    const emailDataArray = parseEmailData(emails);

    return new Response(JSON.stringify(emailDataArray));
  } catch (error) {
    return new Response("Internal Server Error");
  }
}
