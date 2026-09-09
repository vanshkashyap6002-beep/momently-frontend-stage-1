/* ============================================================================
   Momently Stage 1 — payment.js
   Never trusts the client-side Razorpay success callback by itself — it
   always calls /api/payment/verify afterward, which recomputes the HMAC
   signature server-side before marking anything PAID. See
   server/routes/payment.routes.js and server/lib/razorpay.js.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml, formatCurrency, currentUser } = window.Momently;

  let order = null;

  function setStatus(message, type = "") {
    const el = document.getElementById("pay-status");
    el.textContent = message || "";
    el.style.color = type === "error" ? "#8C1D2B" : "rgba(18,16,15,0.55)";
  }

  function resetButton() {
    const btn = document.getElementById("pay-btn");
    btn.disabled = false;
    btn.innerHTML = "Pay Now";
  }

  function setButtonBusy(label) {
    const btn = document.getElementById("pay-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="border-top-color:#fff;border-color:rgba(255,255,255,0.4);"></span> ${escapeHtml(label)}`;
  }

  async function startPayment(orderId) {
    setStatus("Starting payment…");
    setButtonBusy("Starting…");
    try {
      const { keyId, razorpayOrderId, amount, currency } = await apiFetch("/api/payment/create-order", {
        method: "POST",
        body: { orderId },
      });

      if (typeof Razorpay === "undefined") {
        setStatus("Payment couldn't load. Check your connection and refresh the page.", "error");
        resetButton();
        return;
      }

      const rzp = new Razorpay({
        key: keyId,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: "Momently",
        description: order.memoryTitle || "Momently memory",
        theme: { color: "#7A1E2B" },
        handler: async function (response) {
          setStatus("Verifying your payment…");
          try {
            await apiFetch("/api/payment/verify", {
              method: "POST",
              body: {
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            window.location.href = `success.html?order=${encodeURIComponent(orderId)}`;
          } catch (err) {
            setStatus(err.message, "error");
            resetButton();
          }
        },
        modal: {
          ondismiss: function () {
            setStatus("Payment window closed. You can try again whenever you're ready.");
            resetButton();
          },
        },
      });

      rzp.on("payment.failed", function () {
        setStatus("That payment didn't go through. Please try again.", "error");
        resetButton();
      });

      rzp.open();
      setStatus("");
      resetButton();
      document.getElementById("pay-btn").textContent = "Pay Now";
    } catch (err) {
      setStatus(err.message, "error");
      resetButton();
    }
  }

  async function init() {
    const user = await currentUser();
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");

    if (!user) {
      window.location.href = `login.html?next=${encodeURIComponent(`payment.html?order=${orderId || ""}`)}`;
      return;
    }
    if (!orderId) {
      window.location.href = "templates.html";
      return;
    }

    try {
      const { order: o } = await apiFetch(`/api/orders/${orderId}`);
      order = o;

      if (o.paymentStatus === "PAID") {
        window.location.href = `success.html?order=${encodeURIComponent(orderId)}`;
        return;
      }

      document.getElementById("pay-title").textContent = o.memoryTitle || "Your Momently memory";
      document.getElementById("pay-amount").textContent = formatCurrency(o.amount);
      document.getElementById("pay-subtitle").textContent = o.recipientName ? `For ${o.recipientName}` : "";

      const btn = document.getElementById("pay-btn");
      btn.disabled = false;
      btn.addEventListener("click", () => startPayment(orderId));
    } catch (err) {
      document.getElementById("pay-title").textContent = "Couldn't load this order";
      setStatus(err.message, "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
