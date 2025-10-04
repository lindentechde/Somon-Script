# Contributing to SomonScript

Thanks for your interest in improving SomonScript! We welcome issues, pull
requests, documentation updates, and example contributions from the community.

## 🧾 License and Contributor Terms

SomonScript is released under the [MIT License](LICENSE). By submitting a
contribution, you agree that it will be licensed under the same terms. Please do
not include third-party code or assets unless they are also compatible with the
MIT License and you have permission to share them.

## 🛠️ How to Contribute

1. Fork the repository and create a feature branch.
2. Make your changes following the project style and type-safety guidelines.
3. Add or update tests and documentation as needed.
4. Run the project checks locally (see below).
5. Submit a pull request that explains your changes and the motivation behind
   them.

If you are unsure whether a change is wanted, feel free to open a discussion or
issue first so we can collaborate on the direction.

## ✅ Project Standards

We use automated checks to keep the codebase healthy:

- `npm run lint`
- `npm test`
- `npm run audit:examples`

Pull requests should pass all three commands. Conventional Commits are expected
for commit messages, and new code should match the existing ESLint and Prettier
configuration. Production source files (`src/`) should avoid `any` types; prefer
explicit typing or type guards instead.

## 📣 Community Expectations

We strive to foster a respectful, inclusive environment. Treat other community
members with empathy and patience, and assume good intent during discussions.

## 📫 Questions or Support

If you run into trouble or need clarification, open a GitHub issue or reach us
at **info@lindentech.de**. We are happy to help!
