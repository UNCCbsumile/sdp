import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav style={styles.navbar}>
            <h2>Crypto Sim</h2>
            <div>
                <Link to="/">Home</Link>
                <Link to="/trading">Trade</Link>
                <Link to="/portfolio">Portfolio</Link>
            </div>
        </nav>
    );
}

const styles = {
    navbar: { display: "flex", justifyContent: "space-between", padding: "10px", background: "#333", color: "#fff" }
};

export default Navbar;
