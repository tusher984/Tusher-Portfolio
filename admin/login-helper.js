/* ===========================================================================
   Login helper for the dashboard at
   https://tusher984.github.io/Tusher-Portfolio/admin/

   WHY THIS EXISTS
   GitHub Pages only serves files — it cannot keep a secret or talk to GitHub on
   your behalf. Logging in needs one tiny piece of code running somewhere that
   can. This is that piece. It is about 60 lines, it is free to run, and it does
   exactly one thing: hand your browser a GitHub token so the dashboard can save
   your edits.

   HOW TO PUT IT ONLINE (about ten minutes, free, no card needed)

   1. Make a GitHub OAuth app
        github.com → your photo → Settings → Developer settings
        → OAuth Apps → New OAuth App
      Application name:          Tusher Portfolio dashboard
      Homepage URL:              https://tusher984.github.io/Tusher-Portfolio/
      Authorization callback URL: leave it for now — you get it in step 3
      Click Register, then Generate a new client secret.
      Keep the Client ID and Client Secret open in a tab.

   2. Make the worker
        dash.cloudflare.com → sign up free → Workers & Pages
        → Create → Start with Hello World → Deploy
      Then Edit code, delete what is there, paste this whole file, Deploy.
      Cloudflare gives you an address like
        https://something.tusher984.workers.dev
      Copy it.

   3. Finish the GitHub app
      Back in the OAuth app, set Authorization callback URL to your worker
      address plus /callback, for example
        https://something.tusher984.workers.dev/callback
      Save.

   4. Give the worker the two secrets
        Worker → Settings → Variables and Secrets → Add
      Name GITHUB_CLIENT_ID      value: the Client ID
      Name GITHUB_CLIENT_SECRET  value: the Client Secret
      Encrypt the secret one. Deploy again.

   5. Point the dashboard at it
      In admin/config.yml change base_url to your worker address:
        base_url: https://something.tusher984.workers.dev
      Commit that change.

   Then open https://tusher984.github.io/Tusher-Portfolio/admin/ and click
   "Login with GitHub". Because the repo is yours, GitHub lets you in and
   nobody else.

   A NOTE ON HONESTY: I could not test this from where I built your site — I had
   no network access, so treat these steps as carefully-written rather than
   proven. If the popup opens and closes without logging you in, the usual cause
   is a callback URL in step 3 that does not exactly match the worker address,
   including the /callback on the end.
   =========================================================================== */

// Only this site may use the helper. Anything else is turned away, so the
// worker cannot be borrowed by someone else's page.
const ALLOWED_ORIGIN = "https://tusher984.github.io";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Step one: the dashboard sends you here. Bounce on to GitHub.
    if (url.pathname === "/auth") {
      const to = new URL("https://github.com/login/oauth/authorize");
      to.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      to.searchParams.set("redirect_uri", url.origin + "/callback");
      to.searchParams.set("scope", "repo,user");
      return Response.redirect(to.toString(), 302);
    }

    // Step two: GitHub sends you back here with a short-lived code. Swap it for
    // a token, then hand the token to the dashboard window that opened us.
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("No code returned by GitHub.", { status: 400 });

      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: url.origin + "/callback",
        }),
      });

      const data = await res.json();
      const payload = data.access_token
        ? { token: data.access_token, provider: "github" }
        : { error: data.error_description || "Could not get a token from GitHub." };
      const state = data.access_token ? "success" : "error";

      // GitHub's error text ends up inside a <script> tag, so escape the two
      // characters that could break out of it: a quote, and the "<" that would
      // let a stray "</script>" close the tag early.
      const json = JSON.stringify(payload)
        .replace(/'/g, "\\'")
        .replace(/</g, "\\u003c");

      // This is the handshake the dashboard listens for.
      const page =
        "<!doctype html><meta charset=utf-8><title>Signing in…</title>" +
        "<body style=\"font:16px system-ui;padding:2rem;color:#0f1b1d\">" +
        "<p>Signing you in… you can close this window if it stays open.</p>" +
        "<script>(function(){" +
        "var msg='authorization:github:" + state + ":" + json + "';" +
        "function relay(e){" +
        "if(e.origin!==" + JSON.stringify(ALLOWED_ORIGIN) + ")return;" +
        "window.opener.postMessage(msg,e.origin);" +
        "window.removeEventListener('message',relay,false);" +
        "}" +
        "window.addEventListener('message',relay,false);" +
        "window.opener&&window.opener.postMessage('authorizing:github'," + JSON.stringify(ALLOWED_ORIGIN) + ");" +
        "})()</script></body>";

      return new Response(page, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response(
      "This is the login helper for tusher984.github.io/Tusher-Portfolio. " +
        "There is nothing to see here — open the dashboard at /admin/ instead.",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },
};
