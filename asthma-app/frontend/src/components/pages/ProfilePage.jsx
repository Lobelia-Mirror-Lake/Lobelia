import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  uploadAndSaveProfileImage,
} from "../../helper-functions/profile";
import "./ProfilePage.css";
import EditButton from "../input/EditButton";
import ProfileCircle from "../input/ProfileCircle";
import { Card } from "react-bootstrap"

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!birthdayPassed) {
    age -= 1;
  }

  return age;
}

function formatBirthdate(dateOfBirth) {
  if (!dateOfBirth) {
    return "No birthdate saved";
  }

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return dateOfBirth;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(birthDate);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getSymptomsField(profile) {
  if (!profile) return null;

  if (
    Object.prototype.hasOwnProperty.call(
      profile,
      "known_symptoms"
    )
  ) {
    return "known_symptoms";
  }

  if (
    Object.prototype.hasOwnProperty.call(profile, "symptoms")
  ) {
    return "symptoms";
  }

  return null;
}

function EditIcon() {
  return <span aria-hidden="true">✎</span>;
}

function ProfilePage() {
  const { token, user } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [pageStatus, setPageStatus] = useState("loading");
  const [pageError, setPageError] = useState("");

  const [activeEditor, setActiveEditor] = useState(null);

  const [profileDraft, setProfileDraft] = useState({
    name: "",
    date_of_birth: "",
  });

  const [listDraft, setListDraft] = useState([]);
  const [newListItem, setNewListItem] = useState("");

  const [contactDraft, setContactDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setPageStatus("loading");
        setPageError("");

        const data = await getProfile(token);

        if (!cancelled) {
          setProfile(data);
          setPageStatus("success");
        }
      } catch (error) {
        if (!cancelled) {
          setPageStatus("error");
          setPageError(
            error.message || "Unable to load your profile."
          );
        }
      }
    }

    if (token) {
      loadProfile();
    } else {
      setPageStatus("error");
      setPageError(
        "You must be logged in to view your profile."
      );
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const symptomsField = useMemo(
    () => getSymptomsField(profile),
    [profile]
  );

  const symptoms = useMemo(() => {
    if (!symptomsField) return [];

    return normalizeStringArray(profile?.[symptomsField]);
  }, [profile, symptomsField]);

  const triggers = useMemo(
    () =>
      normalizeStringArray(profile?.trigger_preferences),
    [profile]
  );

  const emergencyContacts = useMemo(() => {
    if (
      typeof profile?.emergency_contact !== "string" ||
      !profile.emergency_contact.trim()
    ) {
      return [];
    }

    return [profile.emergency_contact.trim()];
  }, [profile]);

  const age = calculateAge(profile?.date_of_birth);

  const photoSupported =
    profile &&
    Object.prototype.hasOwnProperty.call(
      profile,
      "profile_image_url"
    );

  function openProfileEditor() {
    setActionError("");

    setProfileDraft({
      name: profile?.name || "",
      date_of_birth: profile?.date_of_birth || "",
    });

    setActiveEditor("profile");
  }

  function openTriggersEditor() {
    setActionError("");
    setListDraft(triggers);
    setNewListItem("");
    setActiveEditor("triggers");
  }

  function openSymptomsEditor() {
    setActionError("");

    if (!symptomsField) {
      setActionError(
        "Symptoms are not currently stored by the profile API."
      );
      return;
    }

    setListDraft(symptoms);
    setNewListItem("");
    setActiveEditor("symptoms");
  }

  function openContactEditor() {
    setActionError("");
    setContactDraft(profile?.emergency_contact || "");
    setActiveEditor("contact");
  }

  function closeEditor() {
    if (saving) return;

    setActiveEditor(null);
    setListDraft([]);
    setNewListItem("");
    setContactDraft("");
    setActionError("");
  }

  function addListItem() {
    const item = newListItem.trim();

    if (!item) return;

    const duplicate = listDraft.some(
      (currentItem) =>
        currentItem.toLowerCase() === item.toLowerCase()
    );

    if (duplicate) {
      setActionError("That item is already saved.");
      return;
    }

    setListDraft((currentItems) => [
      ...currentItems,
      item,
    ]);

    setNewListItem("");
    setActionError("");
  }

  function removeListItem(itemToRemove) {
    setListDraft((currentItems) =>
      currentItems.filter(
        (item) => item !== itemToRemove
      )
    );
  }

  async function saveProfileDetails() {
    try {
      setSaving(true);
      setActionError("");

      const updatedProfile = await updateProfile({
        token,
        updates: {
          name: profileDraft.name.trim(),
          date_of_birth:
            profileDraft.date_of_birth || null,
        },
      });

      setProfile(updatedProfile);
      setActiveEditor(null);
    } catch (error) {
      setActionError(
        error.message || "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTriggers() {
    try {
      setSaving(true);
      setActionError("");

      const updatedProfile = await updateProfile({
        token,
        updates: {
          trigger_preferences: listDraft,
        },
      });

      setProfile(updatedProfile);
      setActiveEditor(null);
    } catch (error) {
      setActionError(
        error.message || "Unable to update your triggers."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSymptoms() {
    if (!symptomsField) {
      setActionError(
        "The backend does not support saved symptoms yet."
      );
      return;
    }

    try {
      setSaving(true);
      setActionError("");

      const updatedProfile = await updateProfile({
        token,
        updates: {
          [symptomsField]: listDraft,
        },
      });

      setProfile(updatedProfile);
      setActiveEditor(null);
    } catch (error) {
      setActionError(
        error.message || "Unable to update your symptoms."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEmergencyContact() {
    try {
      setSaving(true);
      setActionError("");

      const updatedProfile = await updateProfile({
        token,
        updates: {
          emergency_contact: contactDraft.trim(),
        },
      });

      setProfile(updatedProfile);
      setActiveEditor(null);
    } catch (error) {
      setActionError(
        error.message ||
          "Unable to update your emergency contact."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoSelected(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!photoSupported) {
      setActionError(
        "Profile image storage is not available from the current backend."
      );
      event.target.value = "";
      return;
    }

    try {
      setUploadingPhoto(true);
      setActionError("");

      const updatedProfile =
        await uploadAndSaveProfileImage({
          file,
          token,
        });

      setProfile(updatedProfile);
    } catch (error) {
      setActionError(
        error.message || "Unable to upload your photo."
      );
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  }

  if (pageStatus === "loading") {
    return (
      <main className="profile-page profile-page-state">
        <h1>Profile</h1>
        <p>Loading your profile...</p>
      </main>
    );
  }

  if (pageStatus === "error") {
    return (
      <main className="profile-page profile-page-state">
        <h1>Profile</h1>
        <p className="profile-error">{pageError}</p>
      </main>
    );
  }

  return (
    <main className="profile-page vertical-40">

      {actionError && !activeEditor && (
        <p className="profile-global-error">
          {actionError}
        </p>
      )}

      <section className="profile-top-grid">
        <Card className="green-theme border-contrast text-center at-middle-center vertical-16" style={{justifyContent:"space-evenly"}}>
          <EditButton
            className="profile-edit-button button-light button-small"
            width="30"
            height="30"
            onClick={openProfileEditor}
            ariaLabel="Edit profile details"
          >
          </EditButton>

          <ProfileCircle
            imageUrl={user?.profile_image_url}
            size={"175px"}
            onClick={() => {
              if (!photoSupported) {
                setActionError(
                  "Profile image storage is not available from the current backend."
                );
                return;
              }

              fileInputRef.current?.click();
            }}
            disabled={uploadingPhoto}
            ariaLabel="Upload profile photo"
            theme={"light-theme"}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoSelected}
            hidden
          />

          <div className="vertical-8">
            <h2 className={"section-header-text"}>{profile?.name || "No name saved"}</h2>

            <p>
              {age === null
                ? "No age available"
                : `${age} years old`}
            </p>

            <p>{formatBirthdate(profile?.date_of_birth)}</p>
          </div>
        </Card>

        <div className="profile-information-column">
          <ProfileListCard
            title="Known Symptoms"
            items={symptoms}
            emptyMessage={
              symptomsField
                ? "No symptoms saved"
                : "Symptoms are not available from the backend yet"
            }
            onEdit={
              symptomsField
                ? openSymptomsEditor
                : null
            }
          />

          <ProfileListCard
            title="Known Triggers"
            items={triggers}
            emptyMessage="No triggers saved"
            onEdit={openTriggersEditor}
          />
        </div>
      </section>

      <ProfileListCard
        title="Emergency Contacts"
        items={emergencyContacts}
        emptyMessage="No emergency contact saved"
        onEdit={openContactEditor}
      />

      {activeEditor && (
        <div
          className="profile-modal-backdrop"
          role="presentation"
          onMouseDown={closeEditor}
        >
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-editor-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="profile-modal-close"
              onClick={closeEditor}
              aria-label="Close editor"
            >
              ×
            </button>

            {activeEditor === "profile" && (
              <>
                <h2 id="profile-editor-title">
                  Edit Profile
                </h2>

                <label className="profile-field">
                  <span>Name</span>

                  <input
                    type="text"
                    value={profileDraft.name}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="profile-field">
                  <span>Birthdate</span>

                  <input
                    type="date"
                    value={profileDraft.date_of_birth}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        date_of_birth:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <EditorError message={actionError} />

                <button
                  type="button"
                  className="profile-save-button"
                  onClick={saveProfileDetails}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

            {(activeEditor === "triggers" ||
              activeEditor === "symptoms") && (
              <>
                <h2 id="profile-editor-title">
                  Edit{" "}
                  {activeEditor === "triggers"
                    ? "Known Triggers"
                    : "Known Symptoms"}
                </h2>

                <div className="profile-editor-items">
                  {listDraft.map((item) => (
                    <div
                      className="profile-editor-item"
                      key={item}
                    >
                      <span>{item}</span>

                      <button
                        type="button"
                        onClick={() =>
                          removeListItem(item)
                        }
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="profile-add-row">
                  <input
                    type="text"
                    value={newListItem}
                    placeholder="Add an item"
                    onChange={(event) =>
                      setNewListItem(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addListItem();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={addListItem}
                  >
                    Add
                  </button>
                </div>

                <EditorError message={actionError} />

                <button
                  type="button"
                  className="profile-save-button"
                  onClick={
                    activeEditor === "triggers"
                      ? saveTriggers
                      : saveSymptoms
                  }
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

            {activeEditor === "contact" && (
              <>
                <h2 id="profile-editor-title">
                  Edit Emergency Contact
                </h2>

                <label className="profile-field">
                  <span>Contact</span>

                  <input
                    type="text"
                    value={contactDraft}
                    placeholder="Name — phone number"
                    onChange={(event) =>
                      setContactDraft(event.target.value)
                    }
                  />
                </label>

                <p className="profile-editor-note">
                  The current backend supports one emergency
                  contact.
                </p>

                <EditorError message={actionError} />

                <button
                  type="button"
                  className="profile-save-button"
                  onClick={saveEmergencyContact}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function ProfileListCard({
  title,
  items,
  emptyMessage,
  onEdit,
  wide = true,
}) {
  return (
    <Card
      className={`green-theme border-contrast text-center ${
        wide ? "profile-list-card-wide" : ""
      }`}
    >
      {onEdit && (
        <EditButton
          className="profile-edit-button button-light button-small"
          width="30"
          height="30"
          onClick={onEdit}
          ariaLabel={`Edit ${title}`}
        >
        </EditButton>
      )}

      <h2 className={"section-header-text"}>{title}</h2>

      <hr />

      {items.length > 0 ? (
        <div className="profile-chip-list">
          {items.map((item) => (
            <span className="profile-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="profile-empty-message">
          {emptyMessage}
        </p>
      )}
    </Card>
  );
}

function EditorError({ message }) {
  if (!message) return null;

  return <p className="profile-error">{message}</p>;
}

export default ProfilePage;