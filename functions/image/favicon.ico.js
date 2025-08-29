export async function onRequestGet() {
  // Redirect /image/favicon.ico to the root PNG icon
  return Response.redirect('/favicon.png', 301);
}
