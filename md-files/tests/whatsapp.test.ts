import { sendWhatsAppMessage } from "../../src/services/whatsapp.service";

test("Send WhatsApp message (mock)", async () => {
  await expect(sendWhatsAppMessage("1234567890", "Hello demo")).resolves.not.toThrow();
});
