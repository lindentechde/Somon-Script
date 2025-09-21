# Community Participation

Thanks for your interest in SomonScript!

**Important:** SomonScript operates under a proprietary license. Please read the
[LICENSE](LICENSE) and [AUTHORS.md](AUTHORS.md) files to understand permitted
uses and restrictions.

## 🚫 What Is Not Permitted

Due to our proprietary license, the following activities are **prohibited**:

- **Forking** or redistributing the SomonScript codebase
- **Modifying** the SomonScript source code or creating derivative works
- **Contributing code changes** or pull requests to the repository
- **Creating competing** programming languages based on SomonScript
- **Reverse engineering** or attempting to alter the compiler

## ✅ How You Can Participate

While direct code contributions are not accepted, you can engage with the
SomonScript community through:

### **Bug Reports & Feature Requests**

- 🐛 **Report bugs** via
  [GitHub Issues](https://github.com/lindentechde/Somon-Script/issues)
- 💡 **Suggest improvements** that align with the project roadmap
- 📋 **Request features** through issue discussions

### **Community Support**

- 💬 **Share usage experiences** and provide feedback
- 🤝 **Help other users** with questions and best practices
- 📚 **Create tutorials** and usage examples (subject to approval)
- 🗣️ **Participate in discussions** about SomonScript usage

### **Documentation & Examples**

- 📖 **Suggest documentation improvements** (subject to approval)
- 🎯 **Share usage examples** and tutorials
- 🌍 **Contribute translations** of documentation

## 📞 Contact

For questions, suggestions, or business inquiries, please contact: **LindenTech
IT Consulting** at **info@lindentech.de**

## 📋 Development Standards (Internal Use)

_The following information is provided for transparency about our internal
development standards:_

### Type Safety Policy

- Production source (`src/`) must not use `as any` or explicit `any` types
- Tests (`tests/`) may use `any` sparingly for constructing test scenarios
- Prefer type guards over `any` where practical

### Code Quality

- All code must pass `npm run lint`
- Test suite must pass: `npm test`
- Examples must be validated: `npm run audit:examples`
- Follow Conventional Commits for commit messages

---

_For complete licensing terms and ownership information, see [LICENSE](LICENSE)
and [AUTHORS.md](AUTHORS.md)._
