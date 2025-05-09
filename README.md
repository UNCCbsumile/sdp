# CryptoSim

A cryptocurrency portfolio simulator that allows users to test different trading strategies without risking real money. Built with Next.js, React, and TypeScript. It uses a file-based storage system (JSON files) instead of a traditional database to store user data, portfolios, and trading strategies. The application connects to Binance's WebSocket API to get real-time cryptocurrency prices and allows users to test different trading strategies like Dollar-Cost Averaging (DCA), Moving Average, and Grid Trading. The frontend is built with modern UI components from shadcn/ui and styled with Tailwind CSS, while the backend uses Next.js API routes to handle authentication, portfolio management, and strategy execution. The system includes features like real-time price updates, portfolio tracking, strategy performance analysis, and a leaderboard for comparing results with other users.

## Quick Start

1. Clone the repository:
```bash
git clone [repository-url]
cd cryptosim-2
```

2. Run the initialization script:
```bash
chmod +x init.sh
./init.sh
```

3. Start the development server:
```bash
npm run dev
```

3. Run unit testing:
```bash
npm test
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Prerequisites

- macOS or Linux operating system
- Basic terminal knowledge

The `init.sh` script will automatically install:
- Node.js (if not present)
- Required npm packages

## Features

- Multiple trading strategies:
  - Dollar-Cost Averaging (DCA)
  - Moving Average
  - Grid Trading
- Real-time cryptocurrency data
- Portfolio tracking
- Strategy performance analysis

## Development

After installation, you can:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Troubleshooting

If you encounter any issues during installation:
1. Make sure you have proper internet connection
2. Try running `npm install` manually if the script fails
3. Check if your system meets the prerequisites
4. For permission errors, try running the script with sudo

## License

This project is licensed under the MIT License - see the LICENSE file for details
