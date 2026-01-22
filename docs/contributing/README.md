# 🤝 Contributing Guide

Terima kasih atas minat Anda untuk berkontribusi pada Laundry SaaS Platform!

## 📋 Daftar Isi

- [Code of Conduct](./code-of-conduct.md) - Pedoman perilaku
- [Development Workflow](./development-workflow.md) - Workflow development
- [Pull Request Process](./pull-request-process.md) - Proses pull request
- [Coding Standards](./coding-standards.md) - Standar coding

## 🚀 Getting Started

1. **Fork repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/laundry-saas.git
   cd laundry-saas
   ```

3. **Create branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make changes**
   - Follow coding standards
   - Write tests
   - Update documentation

5. **Commit changes**
   ```bash
   git commit -m "feat: add new feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**

## 📝 Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```
feat(orders): add order status update endpoint

fix(auth): resolve session expiration issue

docs(api): update API documentation
```

## ✅ Checklist

Before submitting PR:

- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No linting errors
- [ ] All tests passing
- [ ] Commit messages follow convention

## 🔗 Links

- [Development Guide](../development/README.md)
- [Code Style Guide](../development/code-style.md)
- [Architecture Documentation](../architecture/README.md)
