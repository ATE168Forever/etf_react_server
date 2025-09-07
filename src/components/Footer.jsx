export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">&copy; {year} GiantBean</footer>
  );
}
