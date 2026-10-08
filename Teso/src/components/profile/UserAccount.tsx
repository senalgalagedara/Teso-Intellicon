"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Sparkles, Check, Edit, LogOut, Trash2, Mail, User as UserIcon, Calendar, GraduationCap, Award, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { User as PrismaUser } from "@prisma/client";
import { updateUserProfile, updateUserAvatar, deleteUserAccount } from "@/app/actions/profile";
import { logout } from "@teso/auth/actions";
import { AVATAR_LIST } from "@/lib/avatars";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UserAccountProps {
  initialUser: PrismaUser;
}

const STREAM_OPTIONS = [
  { value: "Physical Science", label: "Physical Science (Maths)" },
  { value: "Biological Science", label: "Biological Science (Biology)" },
  { value: "Commerce", label: "Commerce" },
  { value: "Arts", label: "Arts" },
  { value: "Technology", label: "Technology" },
];

const STREAM_SUBJECTS: Record<string, string[]> = {
  "Physical Science": ["Combined Mathematics", "Physics", "Chemistry", "ICT"],
  "Biological Science": ["Biology", "Chemistry", "Physics", "Agriculture"],
  "Commerce": ["Accounting", "Business Studies", "Economics", "ICT"],
  "Arts": ["Sinhala", "History", "Geography", "Political Science", "Logic", "Economics"],
  "Technology": ["Engineering Technology", "Bio-systems Technology", "Science for Technology", "ICT"],
};

const OL_SUBJECTS = ["Mathematics", "Science", "English", "History", "Geography", "Sinhala", "ICT", "Commerce"];

export function UserAccount({ initialUser }: UserAccountProps) {
  const router = useRouter();
  const [user, setUser] = useState<PrismaUser>(initialUser);
  const [isPending, startTransition] = useTransition();
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user.image || AVATAR_LIST[0].path);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Edit Form state
  const [formData, setFormData] = useState({
    name: user.name || "",
    age: user.age ? String(user.age) : "",
    grade: user.grade || "",
    examType: user.examType || "A/L",
    monthsToExam: user.monthsToExam ? String(user.monthsToExam) : "",
    stream: user.stream || "",
    subjects: user.subjects || [],
    image: user.image || "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset stream & subjects if switching to O/L
      if (name === "examType" && value === "O/L") {
        updated.stream = "";
        updated.subjects = [];
      }

      // Reset subjects if stream changes
      if (name === "stream") {
        updated.subjects = [];
      }

      return updated;
    });
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => {
      const isSelected = prev.subjects.includes(subject);
      if (isSelected) {
        return {
          ...prev,
          subjects: prev.subjects.filter((s) => s !== subject),
        };
      } else {
        // Enforce 3 subjects limit for A/L
        if (prev.examType === "A/L" && prev.subjects.length >= 3) {
          toast.warning("You can only select up to 3 subjects for A/L.");
          return prev;
        }
        return {
          ...prev,
          subjects: [...prev.subjects, subject],
        };
      }
    });
  };

  const handleSaveAvatar = () => {
    startTransition(async () => {
      const result = await updateUserAvatar(selectedAvatar);
      if (result.success && result.user) {
        setUser(result.user);
        setFormData((prev) => ({ ...prev, image: selectedAvatar }));
        setIsAvatarPickerOpen(false);
        toast.success("Avatar updated successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update avatar.");
      }
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    startTransition(async () => {
      const result = await updateUserProfile({
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : undefined,
        grade: formData.grade || undefined,
        examType: formData.examType || undefined,
        monthsToExam: formData.monthsToExam ? parseInt(formData.monthsToExam) : undefined,
        stream: formData.stream || undefined,
        subjects: formData.subjects,
      });

      if (result.success && result.user) {
        setUser(result.user);
        setIsEditingAcademic(false);
        toast.success("Academic profile updated successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update profile.");
      }
    });
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user.name || "",
      age: user.age ? String(user.age) : "",
      grade: user.grade || "",
      examType: user.examType || "A/L",
      monthsToExam: user.monthsToExam ? String(user.monthsToExam) : "",
      stream: user.stream || "",
      subjects: user.subjects || [],
      image: user.image || "",
    });
    setIsEditingAcademic(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/";
    } catch (err) {
      toast.error("Failed to logout.");
    }
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText.trim().toLowerCase() !== "delete") {
      toast.error("Please type 'DELETE' to confirm account deletion.");
      return;
    }

    startTransition(async () => {
      const result = await deleteUserAccount();
      if (result.success) {
        toast.success("Your account has been deleted.");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        toast.error(result.error || "Failed to delete account.");
      }
    });
  };

  // Get active subjects options
  const currentSubjectOptions = formData.examType === "O/L"
    ? OL_SUBJECTS
    : (formData.stream ? STREAM_SUBJECTS[formData.stream] || [] : []);

  return (
    <div className="py-6 md:py-8 px-4 md:px-8 w-full space-y-6 max-w-7xl mx-auto">

      {/* Header Block with top-right actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Google Sans', sans-serif" }}>
            Account Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your personal details, academic choices, and authentication controls.
          </p>
        </div>

        {/* Top-Right Account Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="rounded-lg gap-2 h-9"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <span>Log Out</span>
          </Button>
          <Button
            onClick={() => setIsDeleteOpen(true)}
            variant="destructive"
            size="sm"
            className="rounded-lg gap-2 h-9"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </Button>
        </div>
      </div>

      {/* Main vertical stack */}
      <div className="space-y-6">

        {/* Section 1: Basic Profile Details Card */}
        <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div
              onClick={() => {
                setSelectedAvatar(formData.image || AVATAR_LIST[0].path);
                setIsAvatarPickerOpen(true);
              }}
              className="relative group cursor-pointer"
              title="Click to choose avatar"
            >
              <Avatar className="w-24 h-24 ring-4 ring-primary/20 hover:ring-primary shadow-md transition-all duration-300 group-hover:scale-105 bg-slate-100 dark:bg-slate-800">
                <AvatarImage src={formData.image || undefined} alt={user.name || "User"} className="object-cover p-1.5" />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-bold">
                  {(user.name || "User").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAvatar(formData.image || AVATAR_LIST[0].path);
                  setIsAvatarPickerOpen(true);
                }}
                className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground p-1.5 rounded-full cursor-pointer transition-all shadow-md group-hover:scale-110"
                title="Change student avatar"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAvatar(formData.image || AVATAR_LIST[0].path);
                setIsAvatarPickerOpen(true);
              }}
              className="text-xs h-7 px-3 rounded-full border-primary/30 hover:border-primary text-primary hover:bg-primary/5 transition-all flex items-center gap-1.5 font-medium"
            >
              <span>Change Avatar</span>
            </Button>
          </div>


          <div className="flex-1 flex flex-col md:flex-row justify-between w-full gap-6 text-center md:text-left">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">{user.name || "Set your Name"}</h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                {user.email}
              </p>
            </div>

            {user.subjects && user.subjects.length > 0 && (
              <div className="md:border-l md:border-border md:pl-6 space-y-2 flex flex-col items-center md:items-start">
                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Selected Subjects
                </p>
                <div className="flex flex-col gap-1">
                  {user.subjects.map((subj, idx) => (
                    <span
                      key={idx}
                      className="text-sm font-medium text-foreground flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      {subj}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Academic Details Card */}
        {!isEditingAcademic ? (
          /* VIEW MODE (Clean, aesthetic cards) */
          <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Academic Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your academic stage, target examination, and study stream
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingAcademic(true)}
                className="rounded-lg gap-2 border-primary/30 hover:border-primary text-primary hover:bg-primary/5 font-medium shrink-0"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Age */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                <UserIcon className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Age</p>
                  <p className="text-sm font-bold text-foreground">{user.age ? `${user.age} Years Old` : "Not Set"}</p>
                </div>
              </div>

              {/* Grade */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                <GraduationCap className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Grade / Year</p>
                  <p className="text-sm font-bold text-foreground">{user.grade || "Not Set"}</p>
                </div>
              </div>

              {/* Exam Type */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                <Award className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Exam Type</p>
                  <p className="text-sm font-bold text-foreground">{user.examType || "Not Set"}</p>
                </div>
              </div>

              {/* Months left */}
              <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Months to Exam</p>
                  <p className="text-sm font-bold text-foreground">{user.monthsToExam ? `${user.monthsToExam} Months` : "Not Set"}</p>
                </div>
              </div>

              {/* Stream */}
              {user.examType === "A/L" && (
                <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border md:col-span-2">
                  <Award className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Academic Stream</p>
                    <p className="text-sm font-bold text-foreground">{user.stream || "Not Set"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Subjects preview */}
            {user.subjects && user.subjects.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Selected Subjects ({user.subjects.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.subjects.map((subj, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {subj}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* EDIT MODE (ON THE SPOT inside the card - NO POPUP MODAL!) */
          <div className="bg-card text-card-foreground border-2 border-primary/30 shadow-md rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Edit className="w-4 h-4 text-primary" />
                  Edit Academic Profile
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Edit your academic information on the spot and click Save Changes to persist.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isPending}
                  className="rounded-lg h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-lg h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 shadow-sm"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Student Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className="rounded-lg border-input bg-background text-foreground h-10"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Age */}
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Age
                  </Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g. 19"
                    className="rounded-lg border-input bg-background text-foreground h-10"
                  />
                </div>

                {/* Grade / Year */}
                <div className="space-y-1.5">
                  <Label htmlFor="grade" className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Grade / Year
                  </Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(val) => handleSelectChange("grade", val)}
                  >
                    <SelectTrigger className="rounded-lg border-input bg-background h-10">
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                      <SelectItem value="Grade 13">Grade 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="examType" className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Exam Type
                  </Label>
                  <Select
                    value={formData.examType}
                    onValueChange={(val) => handleSelectChange("examType", val)}
                  >
                    <SelectTrigger className="rounded-lg border-input bg-background h-10">
                      <SelectValue placeholder="Select Exam" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      <SelectItem value="O/L">O/L (Ordinary Level)</SelectItem>
                      <SelectItem value="A/L">A/L (Advanced Level)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Months to Exam */}
                <div className="space-y-1.5">
                  <Label htmlFor="monthsToExam" className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Months to Exam
                  </Label>
                  <Input
                    id="monthsToExam"
                    name="monthsToExam"
                    type="number"
                    value={formData.monthsToExam}
                    onChange={handleInputChange}
                    placeholder="e.g. 12"
                    className="rounded-lg border-input bg-background text-foreground h-10"
                  />
                </div>
              </div>

              {/* Academic Stream (if A/L) */}
              {formData.examType === "A/L" && (
                <div className="space-y-1.5">
                  <Label htmlFor="stream" className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Academic Stream
                  </Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(val) => handleSelectChange("stream", val)}
                  >
                    <SelectTrigger className="rounded-lg border-input bg-background h-10">
                      <SelectValue placeholder="Select Stream" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border">
                      {STREAM_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subjects Selection */}
              {((formData.examType === "A/L" && formData.stream) || formData.examType === "O/L") && (
                <div className="space-y-2.5 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Select Subjects
                    </Label>
                    {formData.examType === "A/L" && (
                      <span className="text-xs text-muted-foreground font-medium">
                        ({formData.subjects.length}/3 chosen)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {currentSubjectOptions.map((subj) => {
                      const isSelected = formData.subjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => handleSubjectToggle(subj)}
                          className={cn(
                            "px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all text-left flex items-center justify-between cursor-pointer",
                            isSelected
                              ? "bg-primary/10 border-primary text-primary font-semibold ring-1 ring-primary"
                              : "bg-background border-input text-foreground hover:bg-muted"
                          )}
                        >
                          <span className="truncate">{subj}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isPending}
                  className="rounded-lg px-5 font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-lg px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-xl border border-border shadow-lg bg-background text-foreground p-6">
          <DialogHeader className="mb-4">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive mb-3">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">Delete Account Permanently?</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2 text-sm leading-relaxed">
              This action is <strong className="text-destructive font-semibold">irreversible</strong>. This will permanently delete your user account details, credentials, custom study plans, syllabus progress, and test marks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="confirmDeleteText" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Type <span className="text-destructive font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirmDeleteText"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE here"
              className="rounded-lg border-input bg-transparent text-foreground focus-visible:ring-destructive"
            />
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-5 font-medium"
                onClick={() => setDeleteConfirmationText("")}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDeleteAccount}
              disabled={isPending || deleteConfirmationText.trim().toLowerCase() !== "delete"}
              className="rounded-lg px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Selection Modal */}
      <Dialog open={isAvatarPickerOpen} onOpenChange={setIsAvatarPickerOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto border border-border shadow-2xl bg-card text-card-foreground p-6 sm:p-8">
          <DialogHeader className="mb-4 text-left">
            <div className="flex items-center gap-2.5">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
                  Choose Your Avatar
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                  Select an avatar for your student profile. It will appear across your dashboard and leaderboard.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Current Selection Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/80">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-background ring-4 ring-primary/30 shadow-md flex-shrink-0 p-1.5 flex items-center justify-center">
              <img
                src={selectedAvatar}
                alt="Selected Avatar Preview"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Selection</p>
              <p className="text-sm font-semibold text-foreground">
                {AVATAR_LIST.find((a) => a.path === selectedAvatar)?.label || "Student Avatar"}
              </p>
              <p className="text-xs text-muted-foreground">
                Choose any avatar from the collection below and click Save Avatar to update your profile.
              </p>
            </div>
          </div>

          {/* Avatar Selection Grid */}
          <div className="py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Available Avatars ({AVATAR_LIST.length})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {AVATAR_LIST.map((av) => {
                const isSelected = selectedAvatar === av.path;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.path)}
                    className={cn(
                      "group relative aspect-square rounded-2xl p-2.5 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer",
                      "bg-card hover:bg-muted/50 border",
                      isSelected
                        ? "border-primary ring-4 ring-primary/20 bg-primary/10 scale-105 shadow-md"
                        : "border-border hover:border-primary/50 hover:scale-102"
                    )}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center p-0.5">
                      <img
                        src={av.path}
                        alt={av.label}
                        className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-5 font-medium"
                disabled={isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSaveAvatar}
              disabled={isPending || selectedAvatar === user.image}
              className="rounded-lg px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
            >
              {isPending ? "Saving..." : "Save Avatar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
