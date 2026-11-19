import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getDoc } from "firebase/firestore";
import AdminGuard from "./AdminGuard";
import { ADMIN_ROLE } from "./adminUtils";

vi.mock("../firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(() => "user-ref"), getDoc: vi.fn() }));

function signedInAs(role) {
  onAuthStateChanged.mockImplementation((auth, cb) => {
    cb({ uid: "u1" });
    return () => {};
  });
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role }) });
}

function signedOut() {
  onAuthStateChanged.mockImplementation((auth, cb) => {
    cb(null);
    return () => {};
  });
}

beforeEach(() => vi.clearAllMocks());

describe("FR2.2 AC6 only the Platform Admin can open the queue", () => {
  it("lets the Platform Admin in", async () => {
    signedInAs(ADMIN_ROLE);
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByText("SECRET QUEUE")).toBeInTheDocument();
  });

  it("blocks a donor", async () => {
    signedInAs("donor");
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.queryByText("SECRET QUEUE")).not.toBeInTheDocument();
  });

  it("blocks a hospital user", async () => {
    signedInAs("hospitalAdmin");
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  });

  it("blocks someone who is not logged in", async () => {
    signedOut();
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.queryByText("SECRET QUEUE")).not.toBeInTheDocument();
  });

  it("blocks a user who has no profile document", async () => {
    onAuthStateChanged.mockImplementation((auth, cb) => {
      cb({ uid: "u1" });
      return () => {};
    });
    getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  });

  it("shows a checking message while Firebase is still deciding", () => {
    onAuthStateChanged.mockImplementation(() => () => {});
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(screen.getByText(/checking access/i)).toBeInTheDocument();
  });
});

describe("Access denied screen is never a dead end", () => {
  it("lets a signed-in non-admin log out", async () => {
    signedInAs("donor");
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    fireEvent.click(await screen.findByRole("button", { name: /log out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  it("uses the app's logout handler when one is provided", async () => {
    signedInAs("donor");
    const onLogout = vi.fn();
    render(<AdminGuard onLogout={onLogout}><p>SECRET QUEUE</p></AdminGuard>);
    fireEvent.click(await screen.findByRole("button", { name: /log out/i }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("offers a Back to home link to a signed-in non-admin", async () => {
    signedInAs("donor");
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("offers Go to login (and no Log out) to someone who is not signed in", async () => {
    signedOut();
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });

  it("shows Try again when the check itself fails, and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    onAuthStateChanged.mockImplementation((auth, cb) => {
      cb({ uid: "u1" });
      return () => {};
    });
    getDoc.mockRejectedValueOnce(new Error("network"));
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: ADMIN_ROLE }) });
    render(<AdminGuard><p>SECRET QUEUE</p></AdminGuard>);
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not check your access");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("SECRET QUEUE")).toBeInTheDocument();
  });
});