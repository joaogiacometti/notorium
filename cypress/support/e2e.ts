Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("NEXT_REDIRECT")) {
    return false;
  }
});
