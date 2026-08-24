import type {
  IssueReceiptInput,
  IssueReceiptResult,
  ReceiptProvider,
} from '../types'

export class MockReceiptProvider implements ReceiptProvider {
  name = 'mock'

  validateConfig(): boolean {
    return true
  }

  async issueDocument(input: IssueReceiptInput): Promise<IssueReceiptResult> {
    const stamp = Date.now()
    return {
      success: true,
      provider: this.name,
      externalDocId: `mock-${stamp}`,
      externalDocNumber: `M-${String(stamp).slice(-6)}`,
      pdfUrl: `https://example.com/mock-receipt/${input.bookingId}.pdf`,
      rawResponse: {
        mock: true,
        documentType: input.documentType,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
      },
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true }
  }
}
