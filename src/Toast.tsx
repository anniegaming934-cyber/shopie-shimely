// Toast.tsx
import toast from "react-hot-toast";

export const showToast = {
  success: (msg: string) =>
    toast.success(msg, {
      duration: 2500,
      style: {
        borderRadius: "10px",
        background: "#22c55e",
        color: "#fff",
      },
    }),

  error: (msg: string) =>
    toast.error(msg, {
      duration: 3000,
      style: {
        borderRadius: "10px",
        background: "#dc2626",
        color: "#fff",
      },
    }),

  info: (msg: string) =>
    toast(msg, {
      icon: "ℹ️",
      duration: 2500,
      style: {
        borderRadius: "10px",
        background: "#0369a1",
        color: "#fff",
      },
    }),

  loading: (msg: string) =>
    toast.loading(msg, {
      style: {
        borderRadius: "10px",
        background: "#0ea5e9",
        color: "#fff",
      },
    }),
};
