const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

const products = [
  {
    name: "USB Keylogger",
    description: "Stealthy keystroke logging device.",
    price: 45.0,
    image: "usb_keylogger.jpg"
  },
  {
    name: "BadUSB",
    description: "A powerful penetration testing tool.",
    price: 50.0,
    image: "bad_usb.jpg"
  },
  {
    name: "RFID Cloner",
    description: "Clone and analyze RFID tags with ease.",
    price: 30.0,
    image: "rfid_cloner.jpg"
  },
  {
    name: "Pwnagotchi",
    description: "AI-powered WiFi hacking device.",
    price: 120.0,
    image: "pwnagotchi.jpg"
  },
  {
    name: "BlackArch Linux USB",
    description: "Penetration testing OS with 2800+ tools.",
    price: 29.99,
    image: "kali_usb.jpg"
  },
  {
    name: "Arch Linux USB",
    description: "Minimalist and customizable Linux distro.",
    price: 15.0,
    image: "kali_usb.jpg"
  },
  {
    name: "Kali Linux USB",
    description: "Industry-standard ethical hacking OS.",
    price: 20.0,
    image: "kali_usb.jpg"
  },
  {
    name: "Parrot Security OS USB",
    description: "Privacy-focused penetration testing OS.",
    price: 20.0,
    image: "kali_usb.jpg"
  },
  {
    name: "HTB (Hack The Box) OS USB",
    description: "OS for cybersecurity training & CTFs.",
    price: 25.0,
    image: "kali_usb.jpg"
  },
  {
    name: "Qubes OS USB",
    description: "Security-hardened OS for advanced privacy.",
    price: 20.0,
    image: "kali_usb.jpg"
  },
  {
    name: "Raspberry Pi 4 Cyber Case",
    description: "3D-printed rugged case with cooling.",
    price: 24.99,
    image: "pi4_cyber_case.jpg"
  },
  {
    name: "Raspberry Pi Zero Stealth Case",
    description: "Compact and low-profile Pi Zero case.",
    price: 19.99,
    image: "pi4_cyber_case.jpg"
  },
  {
    name: "Raspberry Pi Cluster Rack",
    description: "Stackable rack for Pi clusters.",
    price: 49.99,
    image: "pi4_cyber_case.jpg"
  },
  {
    name: "USB Rubber Ducky Clone",
    description: "Programmable USB keystroke injection tool.",
    price: 79.99,
    image: "pi4_cyber_case.jpg"
  },
  {
    name: "ESP8266 WiFi Deauther",
    description: "WiFi hacking & testing tool for researchers.",
    price: 39.99,
    image: "pi4_cyber_case.jpg"
  }
];

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log("🌱 Product data seeded!");
  process.exit();
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});
