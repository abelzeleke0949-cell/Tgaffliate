# CPA Hub

Part 1: Lovable AI Prompt (The Frontend Dashboards)

Copy and paste this into Lovable to generate the entire visual layer. It includes the logic for the "Mock Checkout" flow.

Prompt: "Build a React and Tailwind CSS application with two distinct views controlled by a simple navigation toggle. Use standard dummy data, but prepare the UI for API integration.

View 1: The Brand Dashboard (Desktop-first)

Theme: Modern SaaS (white, deep indigo, clean borders).

Sidebar: Dashboard, Launch Campaign, Wallet.

Wallet Section: Show 'Platform Balance: 5,000 ETB'. Include a 'Top Up Wallet (Mock Chapa)' button. When clicked, simulate a loading state and increase the balance by 10,000 ETB.

Launch Campaign Form: Inputs for 'Product Name', 'Total Campaign Budget (ETB)', and 'CPA Reward (ETB per sale)'. A 'Launch' button. When clicked, show a success message (budget deduction will be handled by backend later).

Active Campaigns Table: List campaigns with Title, Budget Remaining (Progress bar), and Total Sales Generated.

View 2: The Telegram Mini App UI (Mobile-only, iPhone Pro dimensions)

This simulates the Influencer and Buyer experience.

Header: Show user avatar and 'Earnings Balance: 150 ETB'.

Body (Influencer Mode): A list of available products to promote. Each card has 'Product Name', 'Reward: 50 ETB per sale', and a 'Generate My Affiliate Link' button. Clicking it displays a mock Telegram link (e.g., t.me/bot?start=inf_123_camp_456).

Body (Buyer Mode - The Checkout Simulator): Add a separate section or toggle to simulate a buyer arriving via a link. Show a 'Product Details' card. Below it, a large 'Buy Now with Chapa' button.

Interaction (Crucial): When 'Buy Now with Chapa' is clicked, show a loading spinner on the button for 2 seconds (simulating the payment gateway). Then change it to a green 'Payment Successful' state. (In integration, this will trigger the mock webhook to pay the influencer).

Please use Lucide React for icons."

Part 2: Node.js, Express & Mongoose Prompt (The Backend)

Copy and paste this into Cursor, GitHub Copilot, or ChatGPT to generate your backend API, database schema, and Telegram bot.

Prompt: "Write a production-ready Node.js and Express backend connected to MongoDB using Mongoose for a Cost-Per-Action (CPA) Affiliate Marketplace. Integrate a Telegram bot using the telegraf library.

1. Mongoose Models:

User: telegramId (String, unique), role (Enum: 'influencer', 'buyer', default 'influencer'), earningsBalance (Number, default 0).

Merchant: businessName (String), walletBalance (Number, default 0).

Campaign: merchantId (ObjectId), productName (String), totalBudget (Number), cpaReward (Number), isActive (Boolean).

Session (For Tracking Clicks): buyerTelegramId (String), referrerId (String - the influencer), campaignId (ObjectId), status (Enum: 'pending', 'converted', default 'pending').

2. REST API Endpoints (Express):

POST /api/merchant/deposit: Mock endpoint to add funds to a Merchant's walletBalance.

POST /api/campaigns: Creates a new campaign, deducts the totalBudget from the Merchant's walletBalance (Escrow logic), and saves it.

GET /api/campaigns: Returns active campaigns.

3. The Conversion Logic (Mock Chapa Webhook):

POST /api/webhooks/chapa-mock: This simulates a successful payment. It accepts { buyerTelegramId, campaignId } in the body.

Logic:

Find the 'pending' Session for this buyer and campaign.

If found, mark status as 'converted'.

Find the Campaign and deduct cpaReward from its totalBudget.

Find the User matching the referrerId (the influencer) and add cpaReward to their earningsBalance.

Use telegraf to send a Telegram message to the referrerId saying: '🎉 Conversion verified! Someone bought the product via your link. [cpaReward] ETB added to your balance.'

4. Telegram Bot Logic (Telegraf):

On /start command: Extract any referral parameters (e.g., if the start parameter is inf_123_camp_456, parse the influencer ID and campaign ID).

Create or find the User based on ctx.from.id.

If a referral parameter exists, create a new Session with status 'pending' linking this new user to the influencer and campaign.

Reply with an Inline Keyboard containing a Telegram Web App button pointing to [https://my-react-app.com](https://my-react-app.com).

Please provide the code structured cleanly, including cors and dotenv. Provide the necessary package.json."

Part 3: The Integration Step

Once you have generated both the React frontend and the Node.js backend, you will need to connect the "Buy Now with Chapa" button in your React code to the /api/webhooks/chapa-mock endpoint on your backend using a simple fetch() request.

Take these prompts to your AI tools now, get the boilerplate code generated, and let me know if you hit any errors when trying to start the Node.js server!

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/010700cd-4fea-47ae-b073-37a1ab66fb45).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
