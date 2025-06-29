# MyStockNote - Trading Journal Application

A comprehensive trading journal application built with React, TypeScript, and Tailwind CSS. Track your trades, manage focus stocks, and analyze your trading performance.

## Features

### 🔐 Authentication System
- **User Registration** with email verification via OTP
- **Secure Login** with email and password
- **Forgot Password** functionality with OTP verification
- **User-specific data storage** - each user's data is isolated

### 📊 Trading Journal
- **Trade Management** - Add, edit, and delete trades
- **Real-time Statistics** - Track total investment, returns, and monthly performance
- **Trade Status Tracking** - Monitor active and closed positions
- **Monthly Filtering** - View trades by specific months and years

### 🎯 Focus Stocks
- **Watchlist Management** - Track potential trading opportunities
- **Target Price Monitoring** - Set and track target prices
- **Trade Conversion Tracking** - Mark when focus stocks become actual trades
- **Performance Analytics** - Monitor conversion rates and potential returns

### 📈 Dashboard
- **Performance Overview** - Key metrics and statistics at a glance
- **Recent Trades** - Quick access to latest trading activity
- **Monthly Analysis** - Detailed breakdown of monthly performance

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React Hooks (useState, useEffect)
- **Data Persistence**: Local Storage (user-specific)

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mystocknote
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── AuthContainer.tsx    # Authentication wrapper
│   ├── LoginForm.tsx        # Login form component
│   ├── SignUpForm.tsx       # Registration form
│   ├── OTPVerification.tsx  # OTP verification
│   ├── ForgotPassword.tsx   # Password reset
│   ├── Dashboard.tsx        # Main dashboard
│   ├── TradeTable.tsx       # Trade listing table
│   ├── TradeModal.tsx       # Trade add/edit modal
│   ├── FocusStocks.tsx      # Focus stocks management
│   ├── FocusStockModal.tsx  # Focus stock add/edit modal
│   ├── FocusStocksTable.tsx # Focus stocks table
│   ├── StatsCard.tsx        # Statistics display card
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── Header.tsx           # Top header with user info
│   └── WelcomeModal.tsx     # Welcome message modal
├── hooks/               # Custom React hooks
│   ├── useAuth.ts           # Authentication logic
│   ├── useTrades.ts         # Trade management logic
│   └── useFocusStocks.ts    # Focus stocks logic
├── types/               # TypeScript type definitions
│   ├── Auth.ts              # Authentication types
│   ├── Trade.ts             # Trade-related types
│   └── FocusStock.ts        # Focus stock types
├── App.tsx              # Main application component
└── main.tsx             # Application entry point
```

## Features in Detail

### Authentication Flow
1. **Sign Up**: User enters name, email, and password
2. **OTP Verification**: 6-digit code sent to email (simulated in development)
3. **Login**: Email and password authentication
4. **Forgot Password**: OTP-based password reset

### Trade Management
- **Add Trades**: Record buy/sell transactions with entry price, quantity, and dates
- **Edit Trades**: Modify existing trade details
- **Close Trades**: Set exit price and date for completed trades
- **Delete Trades**: Remove trades from the journal

### Focus Stocks
- **Add to Watchlist**: Track stocks you're considering for trading
- **Set Targets**: Define target prices and reasons for interest
- **Mark as Taken**: Convert focus stocks to actual trades
- **Performance Tracking**: Monitor conversion rates and potential returns

### Data Storage
- All data is stored locally in the browser's localStorage
- User-specific data isolation ensures privacy
- Data persists across browser sessions

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- Component-based architecture

## Deployment

The application is deployed on Netlify at: https://mystocknote.netlify.app

### Deployment Steps
1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure routing for single-page application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support or questions, please contact the development team.