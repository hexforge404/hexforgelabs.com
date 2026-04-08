/**
 * Product-specific overrides for highlights, use cases, and included items.
 * Maps product slug to handcrafted content.
 * If no override exists, dynamic generation is used as fallback.
 */

export const productOverrides = {
  'usb-keylogger': {
    highlights: [
      'Compact form factor for discreet operation',
      'Compatible with standard USB 2.0 ports',
      'Open-source firmware available',
      'Education & authorized testing only'
    ],
    useCases: [
      'Authorized security research',
      'Controlled lab testing environments',
      'Educational demonstrations',
      'Vulnerability discovery & documentation'
    ],
    whatsIncluded: [
      'USB Keylogger device',
      'Installation guide',
      'Research documentation',
      'Community support access'
    ],
    description: `The USB Keylogger is a compact hardware device designed for authorized security researchers and educators to understand keyboard input capture mechanisms. This device intercepts and logs keystrokes from any keyboard connected through a standard USB port, functioning as a transparent man-in-the-middle device.

Built in-house by our cybersecurity team, this tool demonstrates real-world attack vectors in controlled environments. Whether you're conducting security assessments, developing defensive measures, or educating students about hardware vulnerabilities, the keylogger provides hands-on insight into how data can be intercepted at the physical layer.

The open-source firmware allows researchers to customize logging behavior, integrate with analysis tools, or develop countermeasures. All research should be conducted in authorized, isolated environments with proper documentation and approval from relevant stakeholders.

This is an educational tool for professionals. Responsible disclosure and ethical use are essential.`,
    batchNote: 'Built in-house | Limited availability'
  },
  'badusb': {
    highlights: [
      'Reprograms to emulate any HID device',
      'Firmware customizable via Arduino IDE',
      'Ideal for security assessments',
      'USB 2.0 compatible'
    ],
    useCases: [
      'Red team exercises',
      'Security testing & demonstrations',
      'Custom HID payload development',
      'Authorized penetration testing'
    ],
    whatsIncluded: [
      'BadUSB device',
      'Setup instructions',
      'Example payloads',
      'Developer documentation'
    ],
    description: `BadUSB is a reprogrammable USB device that emulates keyboards and other HID (Human Interface Device) peripherals. When connected to a computer, it can execute keystroke sequences at speeds humans cannot match, allowing delivery of complex commands in seconds—or execute them conditionally based on detected environment.

Originally demonstrated as a research concept, this tool has become essential for red team assessments and penetration testing. Security professionals use BadUSB to test whether users and systems respond correctly to unexpected input, simulate sophisticated attacks, and verify detection capabilities. The device's flexibility makes it valuable for both offense and defense simulation.

Developed and tested in-house, our implementation includes pre-built payloads for common testing scenarios and clear firmware customization documentation. Whether you're demonstrating the risks of physical device trust or running comprehensive security drills, BadUSB provides a tangible, repeatable attack vector.

Custom payloads and integrations are supported through the open Arduino framework. All deployments should follow authorized testing protocols and responsible disclosure practices.`,
    batchNote: 'Handcrafted | Thoroughly tested'
  },
  'rfid-cloner': {
    highlights: [
      'Read & clone 125kHz RFID cards',
      'Portable handheld design',
      'Open firmware for customization',
      'Professional-grade capability'
    ],
    useCases: [
      'Security system testing',
      'RFID vulnerability research',
      'Authorized access control assessment',
      'Educational demonstrations'
    ],
    whatsIncluded: [
      'RFID Cloner device',
      'User manual',
      'Sample cards',
      'Technical reference guide'
    ],
    description: `The RFID Cloner is a compact device designed for security researchers and access control professionals to understand and test RFID security implementations. It can read 125kHz RFID card data and write it to compatible cards, creating functional clones within seconds.

RFID systems power everything from corporate badge access to building security, and understanding their vulnerabilities is critical for organizations protecting physical assets. This tool allows authorized security professionals to identify weak implementations, test counter-measures, and validate that systems properly reject unauthorized credentials.

Our in-house design emphasizes portability and ease of use without sacrificing capability. The open firmware allows integration with custom analysis scripts and testing workflows. Complete technical documentation enables researchers to understand the underlying protocols and develop more sophisticated testing approaches.

Best used in controlled security assessments where access control systems can be tested safely. All testing should follow authorization protocols and responsible disclosure guidelines to improve security across systems.`,
    batchNote: 'Built in-house | Research-grade'
  },
  'pwnagotchi': {
    highlights: [
      'AI-powered WiFi security assessment',
      'Raspberry Pi powered',
      'Real-time display feedback',
      'Passive packet collection'
    ],
    useCases: [
      'WiFi security auditing',
      'Network assessment & learning',
      'Wireless vulnerability research',
      'Educational cybersecurity projects'
    ],
    whatsIncluded: [
      'Pre-configured Raspberry Pi setup',
      'Custom firmware image',
      'User guide & API documentation',
      'Community resources'
    ],
    description: `Pwnagotchi is an AI-powered security research tool that captures and analyzes WiFi packet data passively. It uses machine learning to maximize its effectiveness, gradually learning optimal capture strategies and displaying its "mood" and progress on an integrated display.

Named as a playful reference to its machine learning approach, Pwnagotchi is used by network engineers and security researchers to audit wireless network security, test defenses, and conduct passive security assessments. Unlike active scanners that announce their presence, Pwnagotchi operates passively—invaluable for non-intrusive security research and understanding real-world wireless density.

Built on reliable Raspberry Pi hardware, it's both accessible for learning and powerful enough for professional deployments. The pre-configured image gets you capturing data within minutes. The learning framework enables researchers to develop custom strategies and integrations, making it suitable for ongoing network monitoring and analysis projects.

Perfect for WiFi security assessments, wireless research, and cybersecurity education. All deployments should comply with local regulations and organizational policies.`,
    batchNote: 'Community-tested | AI-powered'
  },
  'blackarch-linux-usb': {
    highlights: [
      'Live penetration testing environment',
      'Pre-loaded with security tools',
      'Persistent storage support',
      'Works on most hardware'
    ],
    useCases: [
      'Authorized penetration testing',
      'Security assessments',
      'Incident response & forensics',
      'Cybersecurity training'
    ],
    whatsIncluded: [
      'BlackArch Linux USB image',
      'Tool documentation',
      'Quick start guide',
      'Community support links'
    ],
    description: `BlackArch Linux is a lightweight, rolling-release penetration testing distribution offering over 2300 security tools. Built on Arch Linux principles, it provides a minimal base with the ability to install exactly what you need, making it ideal for experienced testers who want full control over their environment.

Unlike pre-configured distributions, BlackArch takes a minimalist approach, giving security professionals the flexibility to build custom testing environments. Its philosophy of simplicity and control appeals to researchers and advanced testers who want to understand each component and optimize for specific assessments.

The rolling-release model ensures tools stay current with the latest security advances. Our USB build provides immediate access to the complete tool repository, persistent storage for data retention, and full customization through Arch's package management system. Whether you're conducting complex assessments or developing custom security tools, BlackArch provides a powerful foundation.

Designed for experienced Linux users and security professionals. All penetration testing requires explicit authorization and must comply with applicable laws and regulations.`,
    batchNote: 'Expert-focused | Always up-to-date'
  },
  'kali-linux-usb': {
    highlights: [
      'Industry-standard penetration testing suite',
      'Pre-installed security tools',
      'Persistent encrypted storage',
      'Works on any modern computer'
    ],
    useCases: [
      'Professional penetration testing',
      'Vulnerability assessments',
      'Security training & certification prep',
      'Incident response operations'
    ],
    whatsIncluded: [
      'Kali Linux USB image',
      'Documentation & tool guides',
      'Getting started materials',
      'Online community access'
    ],
    description: `Kali Linux is the industry standard for penetration testing and ethical hacking. Pre-loaded with hundreds of security tools organized by purpose—reconnaissance, scanning, exploitation, wireless testing, forensics, and reporting—it provides everything professionals need for authorized security assessments.

Used by penetration testers, security consultants, and incident responders worldwide, Kali Linux enables systematic vulnerability testing from reconnaissance through exploitation. The curated tool selection, combined with careful integration and documentation, makes it the de facto standard for security training and professional deployments.

Our USB release provides persistence option for maintaining state across reboots and supports encrypted storage for sensitive assessment data. The comprehensive documentation covers initial setup, tool usage, and common workflows. Whether you're pursuing OSCP certification, running assessments, or building incident response capabilities, Kali provides a proven foundation.

All deployments require explicit authorization from system owners. Use responsibly and follow all applicable laws and professional codes of conduct.`,
    batchNote: 'Industry standard | Fully updated'
  },
  'arch-linux-usb': {
    highlights: [
      'Minimal rolling-release Linux distribution',
      'Full control over your environment',
      'Highly customizable setup',
      'Lightweight & fast'
    ],
    useCases: [
      'Custom security tool development',
      'Advanced system administration',
      'Research environment setup',
      'Minimal OS building'
    ],
    whatsIncluded: [
      'Arch Linux USB boot image',
      'Installation guide',
      'Wiki documentation link',
      'Community support resources'
    ],
    description: `Arch Linux is a minimalist, rolling-release Linux distribution built on the principle of simplicity and user control. Unlike prebuilt systems, Arch provides a clean foundation where you install only what you need, understanding each component in your system. This philosophy makes it ideal for advanced users building secure, optimized environments.

Security professionals and researchers choose Arch for building custom security research platforms where every package choice is intentional. The rolling-release model ensures security patches and updates are available immediately, without waiting for major version releases. The philosophy of transparency and control aligns perfectly with security-focused development.

Our USB image provides immediate boot into the Arch installer with persistent storage support. The comprehensive wiki offers installation guidance, system configuration examples, and troubleshooting resources. Whether you're building a dedicated security research platform or learning advanced Linux administration, Arch provides an excellent foundation.

Suitable for experienced Linux users comfortable with command-line system administration. Our community resources support successful installations and system configuration.`,
    batchNote: 'Minimalist | Community-driven'
  },
  'parrot-security-os-usb': {
    highlights: [
      'Security-focused Linux distribution',
      'Lightweight & fast performance',
      'Cloud-friendly tools included',
      'Pen-testing ready'
    ],
    useCases: [
      'Cloud security testing',
      'Lightweight penetration testing',
      'Rapid deployment assessments',
      'Security operations'
    ],
    whatsIncluded: [
      'Parrot Security OS image',
      'User documentation',
      'Tool references',
      'Official wiki access'
    ],
    description: `Parrot Security OS is a security-focused Debian-based distribution optimized for penetration testing, forensics, and privacy protection. Designed for speed and efficiency, Parrot runs smoothly even on lower-spec hardware, making it ideal for rapid deployments and cloud-based testing environments.

With a strong emphasis on privacy and cloud integration, Parrot includes tools specifically selected for modern security challenges—cloud security testing, containerized application assessment, and rapid security evaluations. The distribution is particularly popular with security teams that need to operate efficiently in virtualized and cloud environments.

Our USB release comes pre-configured with the full Parrot arsenal, mate desktop environment, and persistent storage support. The streamlined tool selection provides everything needed for professional assessments without overwhelming complexity. Complete documentation covers installation, tool usage, and integration scenarios.

Suitable for security professionals conducting rapid assessments or those preferring privacy-focused distributions. All testing requires proper authorization and compliance with relevant regulations.`,
    batchNote: 'Cloud-optimized | Privacy-focused'
  },
  'qubes-os-usb': {
    highlights: [
      'Security-focused operating system',
      'Compartmentalized architecture',
      'Expert-level security model',
      'Hardware requirements specific'
    ],
    useCases: [
      'High-security research environments',
      'Sensitive data handling',
      'Advanced cybersecurity work',
      'Privacy-focused operations'
    ],
    whatsIncluded: [
      'Qubes OS ISO image',
      'Installation documentation',
      'Hardware compatibility guide',
      'Security architecture overview'
    ],
    description: `Qubes OS represents a fundamentally different approach to operating system security through compartmentalization. Instead of trusting a single kernel to protect everything, Qubes isolates applications and services into separate virtual machines, limiting damage if any component is compromised. This architecture is designed to defend against sophisticated, targeted attacks.

Used by security researchers, journalists, activists, and professionals handling highly sensitive information, Qubes OS prioritizes security over convenience. Each application runs in its own isolated container with restricted inter-VM communication. If one VM is compromised, others remain protected. This makes it the operating system of choice for environments where security threats are advanced and consequences of compromise are severe.

Qubes requires specific hardware (VT-d/IOMMU support) and technical expertise to operate effectively. Our documentation covers hardware requirements, security architecture decisions, and workflow optimization. The system demands significant learning investment but provides security guarantees unmatched by conventional operating systems.

Designed for security experts and professionals with advanced threat models. Installation requires hardware compatibility verification and technical proficiency. Best suited for experienced users with specific high-security requirements.`,
    batchNote: 'Expert-grade | Compartmentalized'
  },
  'raspberry-pi-4-cyber-case': {
    description: `Purpose-built case for Raspberry Pi 4 projects with built-in passive cooling and cable management. Designed specifically for security research enthusiasts and educators who want a clean, professional setup without complex thermal solutions.

The compact design keeps your Pi secure and organized while maintaining excellent cooling performance. Pre-drilled mounting points accommodate GPIO headers and add-on boards. Perfect for running Pwnagotchi, network monitoring projects, or edge security tools.

Our in-house design optimizes for functionality and accessibility. Whether you're building network security appliances or developing IoT testing platforms, this case provides the professional foundation your projects deserve.`
  },
  'raspberry-pi-zero-stealth-case': {
    description: `Ultra-compact case for Raspberry Pi Zero designed to be unobtrusive while providing robust protection. Perfect for edge deployment scenarios, embedded security projects, and research applications where size and portability matter.

The minimalist design fits in tight spaces and packages easily for transport. Excellent for building portable security assessment tools or deploying lightweight monitoring sensors. Supports GPIO access and includes cable routing solutions.

Ideal for professionals building minimalist security solutions or developers integrating Pi Zero into larger systems.`
  },
  'raspberry-pi-cluster-rack': {
    description: `Professional rack system for organizing multiple Raspberry Pi units into coordinated computing clusters. Designed for researchers and professionals building distributed security platforms, load-balanced services, or high-availability projects.

The modular design accommodates multiple Pi models with integrated power distribution, network switching, and cooling management. Popular for security teams building redundant monitoring systems, distributed analysis platforms, or edge computing research environments.

Our design emphasizes accessibility and scalability. Whether you're learning cluster administration or deploying production systems, this rack provides the infrastructure your project needs.`
  }
};

/**
 * Generate fallback description for a product based on category
 */
const generateDescription = (product) => {
  const title = product.title || product.name || 'Product';
  const categoryDescriptions = {
    hardware: `${title} is a specialized security hardware device designed for authorized testing, research, and education. Built with professional-grade materials and engineering, this device enables hands-on exploration of security concepts in real-world scenarios.

Used by security professionals, educators, and researchers worldwide, ${title} provides tangible insight into how physical security works. The carefully designed implementation supports both authorized assessments and educational demonstrations.

Whether you're conducting security research, developing countermeasures, or teaching cybersecurity fundamentals, ${title} provides practical value. All use should follow authorization protocols and responsible disclosure practices.`,
    
    software: `${title} is a comprehensive software solution designed for authorized security professionals and educators. Built from the ground up to support systematic security testing and assessment workflows.

This tool integrates seamlessly with standard security workflows and supports both individual researchers and team-based operations. The flexible design accommodates various testing methodologies and deployment scenarios.

Perfect for security training, professional assessments, and research projects.`,
    
    'linux': `${title} is a security-focused Linux distribution optimized for authorized penetration testing and security research. This specialized operating system provides a comprehensive collection of security tools alongside a carefully-tuned system environment.

Designed for security professionals, educators, and authorized testers, ${title} streamlines the process of conducting systematic security assessments. The integrated toolset supports reconnaissance, analysis, exploitation, and reporting workflows.

All deployments should follow proper authorization and legal protocols.`,
    
    'security': `${title} is a professional-grade security assessment tool designed for authorized security professionals and researchers. This tool supports systematic evaluation of security controls and identification of potential vulnerabilities.

The implementation emphasizes accuracy and reliability in security testing scenarios. Used by security consultants, incident responders, and authorized security researchers.

Perfect for building effective security assessment capabilities.`
  };

  const defaultDesc = `${title} is a professional-grade tool designed for security professionals and authorized researchers. Built with careful attention to quality and usability, this product supports systematic security assessment and research activities.

Whether you're involved in professional security work or educational projects, ${title} provides reliable performance and thorough capabilities. All deployments should follow applicable authorization and legal protocols.`;

  const categoryKey = product.category || 'software';
  return categoryDescriptions[categoryKey] || defaultDesc;
};

/**
 * Get handcrafted content for a product, with fallback to dynamic generation
 */
export const getProductContent = (slug, product, generators) => {
  const override = productOverrides[slug];
  
  return {
    highlights: override?.highlights || generators.highlights(product),
    useCases: override?.useCases || generators.useCases(product),
    whatsIncluded: override?.whatsIncluded || generators.whatsIncluded(product),
    description: override?.description || generators.description(product),
    batchNote: override?.batchNote || undefined,
  };
};
