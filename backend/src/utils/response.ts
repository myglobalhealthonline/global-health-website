export function placeholderResponse(message = "Endpoint scaffolded. Business logic not implemented yet.") {
  return {
    ok: true,
    message,
  };
}
