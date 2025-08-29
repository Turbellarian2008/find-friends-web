export async function onRequestGet() {
  // Redirect browsers requesting /favicon.ico to the PNG icon at the root
  return Response.redirect('/favicon.png', 301);
}
