// app/api/gmail/route.js
import { google } from "googleapis";
import { db } from "@/db/index";
import { NextApiRequest } from "next";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(req: NextApiRequest) {
  const session = await auth();

  if (!session || !session.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const account = await db
    .select({ access_token: accounts.access_token })
    .from(accounts)
    .where(eq(accounts.userId, session.user?.id));

  if (!account || !account[0].access_token) {
    return new Response(JSON.stringify({ error: "No access token found" }), {
      status: 401,
    });
  }
  try {
    const accessToken = String(account[0].access_token); // Ensure access token is a string
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: authClient });
    // List user's messages (emails)
    const messages = await gmail.users.messages.list({
      userId: "me",
    });

    // Extract message IDs
    const messageIds = messages.data.messages?.map(
      (message: any) => message.id
    );

    if (!messageIds) return;
    // Retrieve email content for each message
    const emails = await Promise.all(
      messageIds.map(async (messageId: string, i) => {
        if (i > 10) return;
        const message = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
        });
        i++;
        return message.data;
      })
    );

    var data = emails[0];
    return new Response(JSON.stringify({ data }));
  } catch (error) {
    console.error("Error fetching user emails:", error);
    return new Response(JSON.stringify(error));
  }
}
