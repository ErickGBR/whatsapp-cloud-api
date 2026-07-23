import QRCode from "qrcode";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// NOTE: For production, it's recommended to use a real Bitcoin API
// like BitPay, Coinbase Commerce, or implement your own wallet
// This is a basic example implementation

export class BitcoinService {
  // Company Bitcoin address (should be in environment variables)
  private companyBitcoinAddress: string = process.env.BITCOIN_ADDRESS || "";

  async generatePaymentAddress(orderId: number, amount: number): Promise<{
    address: string;
    amount: number;
    qrCode?: string;
  }> {
    // In production, this should generate a unique address per transaction
    // using a wallet API or payment service
    const address = this.companyBitcoinAddress || "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

    // Generate QR Code
    const paymentString = `bitcoin:${address}?amount=${amount}`;
    let qrCode = "";
    
    try {
      qrCode = await QRCode.toDataURL(paymentString);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }

    return {
      address,
      amount,
      qrCode,
    };
  }

  formatPaymentMessage(address: string, amount: number, orderNumber: string): string {
    return `💰 *BITCOIN PAYMENT*\n\n` +
           `📋 Order: ${orderNumber}\n` +
           `💵 Amount: $${amount.toFixed(2)} USD\n\n` +
           `📍 Bitcoin Address:\n\`${address}\`\n\n` +
           `Scan the QR code or copy the address to make the payment.\n\n` +
           `Once the payment is complete, send the Transaction ID (TXID) to confirm.`;
  }

  // Verify if a Bitcoin transaction is valid
  // In production, this should consult a blockchain explorer or API
  async verifyPayment(txId: string, address: string, amount: number): Promise<boolean> {
    // Basic implementation - in production should verify on the blockchain
    // For now, just validates the format
    return txId.length > 20 && address.length > 25;
  }

  // Get current Bitcoin price in USD
  async getBitcoinPrice(): Promise<number> {
    try {
      // Use a free API like CoinGecko
      const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
      return response.data.bitcoin?.usd || 0;
    } catch (error) {
      console.error("Error getting Bitcoin price:", error);
      return 0;
    }
  }

  // Convert USD to Bitcoin
  async usdToBitcoin(usdAmount: number): Promise<number> {
    const btcPrice = await this.getBitcoinPrice();
    if (btcPrice === 0) {
      throw new Error("Could not get Bitcoin price");
    }
    return usdAmount / btcPrice;
  }
}

export const bitcoinService = new BitcoinService();

