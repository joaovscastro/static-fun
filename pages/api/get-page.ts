import faunadb from "faunadb";
import uid from "uid-promise";

import { client } from "../../lib/db";

const { Get, Match, Index } = faunadb.query;

export default async (req, res) => {
  let {
    query: { page },
    cookies: { token, linkToken }
  } = req;

  if (!page) {
    res.status(400).json({ error: "provide a page to query" });
  }

  let sessionId;

  if (linkToken) {
    console.log({ linkToken });
    sessionId = linkToken;
    res.setHeader("Set-Cookie", `token=${linkToken}`);
  } else if (token && !linkToken) {
    sessionId = token;
    res.setHeader("Set-Cookie", `token=${token}`);
  } else {
    try {
      sessionId = await uid(10);
      token = sessionId;
      res.setHeader("Set-Cookie", `token=${token}`);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  try {
    let {
      data: { sessionId: savedPageSessionId, html, email }
    } = (await client.query(Get(Match(Index("page_by_name"), page)))) as any;

    console.log({
      sessionId,
      savedPageSessionId
    });

    if (savedPageSessionId === sessionId) {
      res.status(200).json({ html, email, allowEdit: true, token });
      return;
    } else {
      res.status(200).json({ html, email, allowEdit: false, token });
      return;
    }
  } catch (error) {
    if (error.name === "NotFound") {
      res.status(404).json({ html: null, token });
    } else {
      console.error({ error });
      res.status(500).json({ stack: error.stack, message: error.message });
    }
  }
};