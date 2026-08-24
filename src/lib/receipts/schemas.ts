import { z } from 'zod'

export const ReceiptDocumentTypeSchema = z.enum([
  'receipt',
  'tax_invoice',
  'tax_invoice_receipt',
])

export const PaymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'bank_transfer',
  'bit',
  'other',
])

export const IssueReceiptBodySchema = z.object({
  bookingId: z.string().min(1),
  documentType: ReceiptDocumentTypeSchema,
  paymentMethod: PaymentMethodSchema,
  amount: z.number().positive(),
  customerName: z.string().min(1).max(200),
  customerEmail: z
    .string()
    .optional()
    .transform((v) => v ?? '')
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Invalid email',
    }),
  customerPhone: z.string().max(40).optional().default(''),
  customerVatId: z.string().max(20).optional().default(''),
  description: z.string().min(1).max(500),
  docDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type IssueReceiptBody = z.infer<typeof IssueReceiptBodySchema>

export const ReceiptSettingsPutSchema = z.object({
  provider: z.enum(['icount', 'mock']),
  apiToken: z.string().max(500).optional(),
  /** When true, keep existing token if apiToken is empty */
  keepExistingToken: z.boolean().optional().default(true),
  defaultVatId: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  test: z.boolean().optional().default(false),
})

export type ReceiptSettingsPutBody = z.infer<typeof ReceiptSettingsPutSchema>
