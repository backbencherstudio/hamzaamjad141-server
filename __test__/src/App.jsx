import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import axios from "axios";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const cardElementRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (window.Stripe) {
      setStripeLoaded(true);
      const stripeInstance = window.Stripe("pk_test_51QuTWKClJBhr3sfisvZF8NprucrbSftJa16ma4XVStJG04nQ5i4tNL00XkBbfC0UFzY8AvnFhzt8wTk1CbXj57o500ncgA4fQl");
      setStripe(stripeInstance);
      setElements(stripeInstance.elements());
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => {
      setStripeLoaded(true);
      const stripeInstance = window.Stripe("pk_test_51QuTWKClJBhr3sfisvZF8NprucrbSftJa16ma4XVStJG04nQ5i4tNL00XkBbfC0UFzY8AvnFhzt8wTk1CbXj57o500ncgA4fQl");
      setStripe(stripeInstance);
      setElements(stripeInstance.elements());
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (showPayment && stripeLoaded && elements && !cardElementRef.current) {
      const cardElement = elements.create("card");
      cardElement.mount("#card-element");
      cardElementRef.current = cardElement;
    }
  }, [showPayment, stripeLoaded, elements]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post("http://localhost:3000/users/login", { email, password });
      if (response.data.success) {
        localStorage.setItem("token", response.data?.token);
        setShowPayment(true);
      }
    } catch (error) {
      setErrorMessage("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

const handleGeneratePaymentMethod = async () => {
  if (!stripe || !elements || !cardElementRef.current) {
    console.error("Stripe not initialized");
    return;
  }

  try {
    // Create PaymentMethod instead of token
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElementRef.current,
    });

    if (error) {
      console.error("Error creating payment method:", error);
      setErrorMessage(error.message);
    } else {
      console.log("PaymentMethod generated:", paymentMethod);
      setPaymentMethodId(paymentMethod.id);
    }
  } catch (error) {
    console.error("Stripe Error:", error);
    setErrorMessage("Failed to generate payment method");
  }
};
const handlePaymentSubmit = async () => {
  if (!paymentMethodId) {
    alert("Please generate a payment method first.");
    return;
  }

  setLoading(true);
  try {
    const response = await axios.post(
      "http://localhost:3000/subscription/pay",
      { paymentMethodId },
      {
        headers: { 
          Authorization: localStorage.getItem("token"),
          'Content-Type': 'application/json'
        },
      }
    );

    if (response.data.success) {
      alert("Subscription successful!");
      // Optionally redirect or update UI
    } else {
      alert(response.data.error || "Subscription failed!");
    }
  } catch (error) {
    console.error("Payment error:", error);
    if (error.response) {
      // Handle specific error messages from backend
      alert(error.response.data.error || "Payment failed");
    } else {
      alert("Network error. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ width: "300px", padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
        {!showPayment ? (
          <>
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Login</h2>
            {errorMessage && <div style={{ color: "red", marginBottom: "10px" }}>{errorMessage}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                required
              />
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                required
              />
              <button
                type="submit"
                style={{
                  padding: "10px",
                  borderRadius: "4px",
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Stripe Payment</h2>
            <div id="card-element" style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}></div>
            <button
              onClick={handleGeneratePaymentMethod}
              style={{
                padding: "10px",
                borderRadius: "4px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                marginBottom: "10px",
                width: "100%",
              }}
              disabled={!stripeLoaded}
            >
              Generate Payment Method
            </button>
            <button
              onClick={handlePaymentSubmit}
              style={{
                padding: "10px",
                borderRadius: "4px",
                backgroundColor: "#2196F3",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                width: "100%",
              }}
              disabled={loading || !paymentMethodId}
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


const StripePage = () => {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ padding: "20px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Stripe Payment Page</h2>
        <p style={{ textAlign: "center" }}>Here you can proceed with your Stripe payment.</p>
      </div>
    </div>
  );
};

function AppWrapper() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stripe" element={<StripePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppWrapper;
