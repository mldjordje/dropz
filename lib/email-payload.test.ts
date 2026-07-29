import { describe, expect, it } from "vitest";
import { emailAddressFromContact, resendPayload } from "./email-payload";

describe("resendPayload", () => {
  it("uses the verified sender and optional reply-to address", () => {
    expect(
      resendPayload({
        from: "Dropz Tattoo <rezervacije@mail.dropz.rs>",
        recipient: "klijent@example.com",
        subject: "Termin",
        body: "Primili smo zahtev.",
        replyTo: "studio@dropz.rs",
      }),
    ).toEqual({
      from: "Dropz Tattoo <rezervacije@mail.dropz.rs>",
      to: ["klijent@example.com"],
      subject: "Termin",
      text: "Primili smo zahtev.",
      reply_to: "studio@dropz.rs",
    });
  });
});

describe("emailAddressFromContact", () => {
  it("accepts an email and rejects a phone number", () => {
    expect(emailAddressFromContact(" Klijent@Example.com ")).toBe("klijent@example.com");
    expect(emailAddressFromContact("+381 60 123 456")).toBeNull();
  });
});
