const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  entry: {
    popup: './src/popup/App.tsx',
    content: './src/content/index.ts',
    background: './src/background/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    publicPath: '/'  // This ensures paths are relative to the extension root
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new HtmlWebpackPlugin({
      template: './public/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
      inject: 'body'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { 
          from: 'public/manifest.json', 
          to: 'manifest.json',
          transform(content) {
            // Update manifest paths during copy
            const manifest = JSON.parse(content.toString());
            return JSON.stringify(manifest, null, 2);
          }
        },
        { 
          from: 'src/content/content.css', 
          to: 'content.css' 
        }
      ]
    })
  ],
  devtool: 'cheap-module-source-map',
  optimization: {
    splitChunks: false
  }
};
