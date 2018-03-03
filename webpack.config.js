var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
// const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    // app: './index.js'
    app: './src/app.js'
  },
  resolve: {
      alias: {
        // Lib: path.resolve(__dirname, 'demo/lib/'),
        // Shaders: path.resolve(__dirname, 'demo/lib/src/shaders')
      }
  },
  output: {
    filename: '[name].js',
    // path: path.resolve(__dirname, 'build')
    path: path.resolve(__dirname, '.')
  },
  module: {
    rules: [
        {
            test: /\.css$/,
            use: [
              'style-loader',
              'css-loader'
            ]
        }
        // {
        //     test: /\.(png|jpg|gif)$/,
        //     use: [
        //         'file-loader'
        //     ]
        // },
        // {
        //     test: /\.(glsl|vs|fs)$/,
        //     use: [
        //         'shader-loader'
        //     ]
        // }
    ]
  },
  plugins: [
        new HtmlWebpackPlugin({
          title: "gl-avatar-three-js",
          template: "html/test-template.html"
        })
    ],
  devServer: {
    // contentBase: path.join(__dirname, "demo"),
    contentBase: __dirname,
    port: 7000
  }
};