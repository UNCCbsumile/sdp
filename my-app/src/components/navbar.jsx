import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav className="navbar">
            <h2 className="logo">Cryptoverse</h2>
            <div className="nav-links">
                <Link to="/">Home</Link>
                <Link to="/trading">Trade</Link>
                <Link to="/portfolio">Portfolio</Link>
            </div>
        </nav>
    );
}

export default Navbar;
