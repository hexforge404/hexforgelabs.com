const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  {
    name: "USB Keylogger",
    sku: "USBKEY01",
    description: "Stealthy keystroke logging device.",
    price: 45.0,
    image: "/images/key_logger.jpg",
    brand: "HexForge Labs",
    stock: 15,
    categories: ["hardware", "security"],
    isFeatured: true
  },
  {
    name: "BadUSB",
    sku: "BADUSB02",
    description: "A powerful penetration testing tool.",
    price: 50.0,
    image: "/images/bad_usb.jpg",
    brand: "HexForge Labs",
    stock: 10,
    categories: ["hardware", "security"],
    isFeatured: true
  },
  {
    name: "RFID Cloner",
    sku: "RFIDCL03",
    description: "Clone and analyze RFID tags with ease.",
    price: 30.0,
    image: "/images/rfid_reader_kit.jpg",
    brand: "HexForge Labs",
    stock: 8,
    categories: ["hardware"]
  },
  {
    name: "Pwnagotchi",
    sku: "PWNGTC04",
    description: "AI-powered WiFi hacking device.",
    price: 120.0,
    image: "/images/pwnagotchi.jpg",
    brand: "HexForge Labs",
    stock: 5,
    categories: ["hardware", "security"],
    isFeatured: true
  },
  {
    name: "BlackArch Linux USB",
    sku: "BLKARC05",
    description: "Penetration testing OS with 2800+ tools.",
    price: 29.99,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 20,
    categories: ["software", "os"]
  },
  {
    name: "Arch Linux USB",
    sku: "ARCHLN06",
    description: "Minimalist and customizable Linux distro.",
    price: 15.0,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 25,
    categories: ["software", "os"]
  },
  {
    name: "Kali Linux USB",
    sku: "KALIUS07",
    description: "Industry-standard ethical hacking OS.",
    price: 20.0,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 30,
    categories: ["software", "os"],
    isFeatured: true
  },
  {
    name: "Parrot Security OS USB",
    sku: "PRRTOS08",
    description: "Privacy-focused penetration testing OS.",
    price: 20.0,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 18,
    categories: ["software", "os"]
  },
  {
    name: "HTB (Hack The Box) OS USB",
    sku: "HTBOSU09",
    description: "OS for cybersecurity training & CTFs.",
    price: 25.0,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 12,
    categories: ["software", "os"]
  },
  {
    name: "Qubes OS USB",
    sku: "QUBEOS10",
    description: "Security-hardened OS for advanced privacy.",
    price: 20.0,
    image: "/images/kali_usb.jpg",
    brand: "HexForge Labs",
    stock: 10,
    categories: ["software", "os"]
  },
  {
    name: "Raspberry Pi 4 Cyber Case",
    sku: "PI4CAS11",
    description: "3D-printed rugged case with cooling.",
    price: 24.99,
    image: "/images/pi_case.jpg",
    brand: "HexForge Labs",
    stock: 15,
    categories: ["accessories", "raspberry-pi"]
  },
  {
    name: "Raspberry Pi Zero Stealth Case",
    sku: "PZRCAS12",
    description: "Compact and low-profile Pi Zero case.",
    price: 19.99,
    image: "/images/pi_case.jpg",
    brand: "HexForge Labs",
    stock: 20,
    categories: ["accessories", "raspberry-pi"]
  },
  {
    name: "Raspberry Pi Cluster Rack",
    sku: "PIRACK13",
    description: "Stackable rack for Pi clusters.",
    price: 49.99,
    image: "/images/pi_case.jpg",
    brand: "HexForge Labs",
    stock: 8,
    categories: ["accessories", "raspberry-pi"]
  },
  {
    name: "USB Rubber Ducky Clone",
    sku: "DUCKY14",
    description: "Programmable USB keystroke injection tool.",
    price: 79.99,
    image: "/images/usb1.jpg",
    brand: "HexForge Labs",
    stock: 7,
    categories: ["hardware", "security"],
    isFeatured: true
  },
  {
    name: "ESP8266 WiFi Deauther",
    sku: "ESP82615",
    description: "WiFi hacking & testing tool for researchers.",
    price: 39.99,
    image: "/images/esp8266_deauther.jpg",
    brand: "HexForge Labs",
    stock: 12,
    categories: ["hardware", "security"]
  }
];


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await Product.deleteMany(); // Clear existing products
    const createdProducts = await Product.insertMany(products);
    console.log("Database seeded with products:", createdProducts);
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

connectDB();
seedDatabase();
// Note: Make sure to run this script with Node.js and have your MongoDB server running.
// You can run this script using the command: docker exec -it hexforge-backend node seedProducts.js
// Ensure you have the necessary packages installed:
// npm install mongoose dotenv
// This script connects to a MongoDB database and seeds it with an array of product objects.
// Each product object contains fields like name, description, price, image, brand, stock, categories, and isFeatured.
// The script first connects to the MongoDB database using Mongoose.
// It then clears any existing products in the database using Product.deleteMany().
// After that, it inserts the new products into the database using Product.insertMany().
// Finally, it closes the database connection.
// Make sure to have a MongoDB server running and the connection URI set in your environment variables.
// You can adjust the MongoDB URI in the .env file to point to your database.
// The products array contains sample product data that will be inserted into the database.
// Each product has a name, description, price, image URL, brand, stock quantity, categories, and a featured status.
// The script uses async/await for handling asynchronous operations, making it easier to read and maintain.
// The connectDB function establishes a connection to the MongoDB database.
// The seedDatabase function handles the seeding process, including clearing existing products and inserting new ones.
// The script uses try/catch blocks to handle any errors that may occur during the database operations.
// The script logs the results of the seeding process to the console, including any errors that may occur.
// Make sure to have the Mongoose model for Product defined in a separate file (models/Product.js).
// The Product model should define the schema for the product documents in the MongoDB collection.
// You can customize the product data in the products array to match your application's requirements.
// The script is designed to be run in a Node.js environment, and it uses the dotenv package to load environment variables.
// Make sure to install the dotenv package if you haven't already:
// npm install dotenv
// You can run this script using Node.js from the command line or as part of your application's startup process.
// To run the script, use the following command:
// node seedProducts.js
// Make sure to have your MongoDB server running and accessible at the URI specified in the .env file.
// You can also run this script inside a Docker container if your application is containerized.
// If you're using Docker, you can run the script inside the container using the following command:
// docker exec -it <container_name> node seedProducts.js
// Replace <container_name> with the name of your running Docker container.
// This script is a simple way to seed your MongoDB database with initial product data.
// You can modify the products array to add or change the products as needed.
// The script uses Mongoose for MongoDB object modeling, making it easy to interact with the database.
// Make sure to have Mongoose installed in your project:
// npm install mongoose
// The script uses async/await for handling asynchronous operations, making it easier to read and maintain.
// The connectDB function establishes a connection to the MongoDB database using Mongoose.
// The seedDatabase function handles the seeding process, including clearing existing products and inserting new ones.
// The script uses try/catch blocks to handle any errors that may occur during the database operations.
// The script logs the results of the seeding process to the console, including any errors that may occur.
// Make sure to have the Mongoose model for Product defined in a separate file (models/Product.js).
// The Product model should define the schema for the product documents in the MongoDB collection.
// You can customize the product data in the products array to match your application's requirements.
// The script is designed to be run in a Node.js environment, and it uses the dotenv package to load environment variables.
// Make sure to install the dotenv package if you haven't already:
// npm install dotenv
// You can run this script using Node.js from the command line or as part of your application's startup process.
// To run the script, use the following command:
// node seedProducts.js
// Make sure to have your MongoDB server running and accessible at the URI specified in the .env file.
// You can also run this script inside a Docker container if your application is containerized.
// If you're using Docker, you can run the script inside the container using the following command:
// docker exec -it <container_name> node seedProducts.js
// Replace <container_name> with the name of your running Docker container.
// This script is a simple way to seed your MongoDB database with initial product data.
// You can modify the products array to add or change the products as needed.
// The script uses Mongoose for MongoDB object modeling, making it easy to interact with the database.
// Make sure to have Mongoose installed in your project:
// npm install mongoose
// The script uses async/await for handling asynchronous operations, making it easier to read and maintain.
// The connectDB function establishes a connection to the MongoDB database using Mongoose.
// The seedDatabase function handles the seeding process, including clearing existing products and inserting new ones.    
// Ensure you have the necessary environment variables set in a .env file:
// MONGO_URI=mongodb://localhost:27017/your_database_name
// Adjust the MongoDB URI as needed for your setup.
// This script will clear the existing products in the database and insert the new ones.
// You can modify the products array to add or change the products as needed.
// Make sure to have the Product model defined in the models/Product.js file.
// The Product model should be defined using Mongoose and should match the structure of the products in the array.
// This script is useful for seeding your database with initial data for development or testing purposes.
// You can run this script whenever you need to reset the database to its initial state.
// Make sure to handle any errors that may occur during the database connection or seeding process.
// You can also add additional logging or error handling as needed.
// If you want to run this script in a production environment, be cautious about clearing the database.
// You may want to implement a more sophisticated seeding strategy that doesn't clear existing data.
// Always back up your database before running scripts that modify data.
// This script is a simple example of how to seed a MongoDB database with initial data using Mongoose.
// You can expand upon this script to include more complex seeding logic or additional data types.
// You can also create separate scripts for different types of data or different collections in your database.
// This script is a good starting point for anyone looking to seed their MongoDB database with initial data.            