const CARDCOM_API_BASE = 'https://secure.cardcom.solutions/api/v11'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateSubscriptionLowProfileParams {
  amount: number           // ₪150 or ₪1000
  uniqueId: string         // our payment record ID
  planId: 'monthly' | 'annual'
  userName: string
  userEmail: string
  userPhone?: string
  successUrl: string
  failedUrl: string
  cancelUrl: string
  webhookUrl: string
}

export interface CreateLowProfileResult {
  lowProfileId: string
  url: string
}

export interface DocumentInfo {
  DocumentType: string | null
  DocumentNumber: number | null
}

export interface TransactionInfo {
  TransactionId: number
  AuthNum: string
  Sum: number
  CurrencyType: number
  CardName: string
  Last4Digits: string
}

export interface LowProfileResult {
  ResponseCode: number
  Description: string | null
  TerminalNumber: number
  LowProfileId: string
  TranzactionId: number | null
  ReturnValue: string | null
  Operation: string | null
  DocumentInfo: DocumentInfo | null
  TranzactionInfo: TransactionInfo | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCredentials() {
  const terminalNumber = process.env.CARDCOM_TERMINAL_NUMBER
  const apiName = process.env.CARDCOM_API_NAME

  if (!terminalNumber || !apiName) {
    throw new Error('Missing CARDCOM_TERMINAL_NUMBER or CARDCOM_API_NAME environment variables')
  }

  return {
    TerminalNumber: Number(terminalNumber),
    ApiName: apiName,
  }
}

function getApiUrl() {
  return process.env.CARDCOM_API_URL ?? CARDCOM_API_BASE
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Create a Cardcom LowProfile payment page for a subscription.
 * Returns lowProfileId (store in DB) and url (load in iframe).
 */
export async function createSubscriptionLowProfile(
  params: CreateSubscriptionLowProfileParams
): Promise<CreateLowProfileResult> {
  const { TerminalNumber, ApiName } = getCredentials()

  const planLabel = params.planId === 'monthly' ? 'מנוי חודשי Hostly' : 'מנוי שנתי Hostly'

  const body = {
    TerminalNumber,
    ApiName,
    Operation: 'ChargeOnly',
    ReturnValue: params.uniqueId,
    Amount: params.amount,
    SuccessRedirectUrl: params.successUrl,
    FailedRedirectUrl: params.failedUrl,
    CancelUrl: params.cancelUrl,
    WebHookUrl: params.webhookUrl,
    Language: 'he',
    ISOCoinId: 1,
    UIDefinition: {
      CardOwnerNameValue: params.userName,
      CardOwnerEmailValue: params.userEmail,
      ...(params.userPhone ? { CardOwnerPhoneValue: params.userPhone } : {}),
    },
    Document: {
      DocumentTypeToCreate: 'Auto',
      IsAllowEditDocument: false,
      Name: params.userName,
      Email: params.userEmail,
      ...(params.userPhone ? { Mobile: params.userPhone } : {}),
      Language: 'he',
      Products: [
        {
          Description: planLabel,
          UnitCost: params.amount,
          Quantity: 1,
        },
      ],
    },
  }

  const response = await fetch(`${getApiUrl()}/LowProfile/Create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Cardcom HTTP error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as {
    ResponseCode: number
    Description?: string
    LowProfileId?: string
    Url?: string
  }

  if (data.ResponseCode !== 0) {
    throw new Error(`Cardcom error (${data.ResponseCode}): ${data.Description ?? 'Unknown error'}`)
  }

  if (!data.LowProfileId || !data.Url) {
    throw new Error('Cardcom response missing LowProfileId or Url')
  }

  return { lowProfileId: data.LowProfileId, url: data.Url }
}

/**
 * Verify a completed payment by fetching the result from Cardcom.
 * Always call this server-side — never trust webhook body alone.
 */
export async function getLowProfileResult(
  lowProfileId: string,
  retries = 1
): Promise<LowProfileResult> {
  const { TerminalNumber, ApiName } = getCredentials()

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      return await fetch(`${getApiUrl()}/LowProfile/GetLpResult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TerminalNumber, ApiName, LowProfileId: lowProfileId }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  let response: Response
  try {
    response = await attempt()
    if (!response.ok && retries > 0) response = await attempt()
  } catch {
    if (retries > 0) response = await attempt()
    else throw new Error('Cardcom GetLpResult failed after retries')
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Cardcom GetLpResult HTTP error ${response.status}: ${text}`)
  }

  return (await response.json()) as LowProfileResult
}
