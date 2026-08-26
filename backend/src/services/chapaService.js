const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

// Starts a Chapa checkout session and returns the hosted payment page URL.
export const initializeTransaction = async ({
  amount,
  email,
  firstName,
  lastName,
  txRef,
  callbackUrl,
  returnUrl,
}) => {
  const response = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      amount: String(amount),
      currency: 'ETB',
      email,
      first_name: firstName,
      last_name: lastName,
      tx_ref: txRef,
      callback_url: callbackUrl,
      return_url: returnUrl,
      customization: {
        title: 'Wallet Top-Up',
        description: 'Add funds to your CPA Hub wallet',
      },
    }),
  });

  const json = await response.json();
  if (!response.ok || json.status !== 'success') {
    const detail = typeof json.message === 'string' ? json.message : JSON.stringify(json.message);
    throw new Error(detail || 'Failed to initialize Chapa transaction');
  }

  return { checkoutUrl: json.data.checkout_url };
};

// Independently re-verifies a transaction's status with Chapa — never trust a client
// redirect or webhook body alone, always confirm server-to-server before crediting funds.
export const verifyTransaction = async (txRef) => {
  const response = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const json = await response.json();
  if (!response.ok) {
    const detail = typeof json.message === 'string' ? json.message : JSON.stringify(json.message);
    throw new Error(detail || 'Failed to verify Chapa transaction');
  }

  return { status: json.data?.status, raw: json.data };
};
