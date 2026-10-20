import React, { useEffect, useRef, useState } from "react";
import "./App.css";

const API =
  "https://api.inaturalist.org/v1/observations/species_counts?taxon_id=47224&per_page=100&page=1";

const initialForm = {
  name: "",
  scientific: "",
  image: "",
  observations: "0",
};

const App = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(initialForm);
  const [imageOption, setImageOption] = useState("url");
  const [uploadedImage, setUploadedImage] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const timerRef = useRef(null);
  const fileRef = useRef(null);
  const limit = 12;

  useEffect(() => {
    const controller = new AbortController();

    const fetchButterflies = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API, {
          signal: controller.signal,
        });

        console.log(
          `Butterfly API: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          const messages = {
            400: "400 - Bad Request",
            401: "401 - Unauthorized",
            403: "403 - Forbidden",
            404: "404 - Not Found",
            500: "500 - Internal Server Error",
            503: "503 - Service Unavailable",
          };

          throw new Error(
            messages[response.status] ||
              `${response.status} - ${response.statusText}`
          );
        }

        const result = await response.json();

        const butterflies = (result.results || [])
          .filter((item) => item.taxon)
          .map((item) => ({
            id: item.taxon.id,
            name:
              item.taxon.preferred_common_name ||
              item.taxon.name,
            scientific: item.taxon.name,
            image:
              item.taxon.default_photo?.medium_url ||
              item.taxon.default_photo?.url ||
              "",
            observations: item.count,
            attribution:
              item.taxon.default_photo?.attribution || "",
            custom: false,
          }));

        if (!controller.signal.aborted) {
          setData(butterflies);
          console.log(
            "200 OK - Butterfly gallery loaded successfully"
          );
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        const message =
          err instanceof TypeError
            ? "Network Error - Failed to fetch. Check your internet connection."
            : err.message;

        console.error("Butterfly API Error:", message);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchButterflies();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      const message =
        "Network Error - You are offline. Check your internet connection.";

      console.error(message);
      setError(message);
    };

    const handleOnline = () => {
      console.log("Network connection restored");
      window.location.reload();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormMessage("");
  };

  const handleImageOptionChange = (option) => {
    setImageOption(option);
    setFormMessage("");

    if (option === "url") {
      setUploadedImage("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } else {
      setForm((previous) => ({
        ...previous,
        image: "",
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    setFormMessage("");

    if (!file) {
      setUploadedImage("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormMessage("Please select an image file.");
      e.target.value = "";
      setUploadedImage("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormMessage("Image must be smaller than 5 MB.");
      e.target.value = "";
      setUploadedImage("");
      return;
    }

    setUploadedImage(URL.createObjectURL(file));
  };

  const handleAddButterfly = (e) => {
    e.preventDefault();
    setFormMessage("");

    const name = form.name.trim();
    const scientific = form.scientific.trim();

    const image =
      imageOption === "url"
        ? form.image.trim()
        : uploadedImage;

    if (!name || !scientific || !image) {
      setFormMessage(
        "Please fill in all required fields and select an image."
      );
      return;
    }

    if (imageOption === "url") {
      try {
        const parsedUrl = new URL(image);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          setFormMessage("Please enter a valid image URL.");
          return;
        }
      } catch {
        setFormMessage("Please enter a valid image URL.");
        return;
      }
    }

    const newButterfly = {
      id: `custom-${Date.now()}`,
      name,
      scientific,
      image,
      observations: Number(form.observations) || 0,
      attribution: "",
      custom: true,
    };

    setData((previous) => [newButterfly, ...previous]);
    setSearch("");
    setPage(1);
    setForm(initialForm);
    setUploadedImage("");
    setImageOption("url");

    if (fileRef.current) {
      fileRef.current.value = "";
    }

    setFormMessage(`"${name}" added to your gallery!`);

    console.log("New butterfly added:", newButterfly);
  };

  const filteredData = data.filter((item) =>
    `${item.name} ${item.scientific}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / limit);

  const currentData = filteredData.slice(
    (page - 1) * limit,
    page * limit
  );

  const openButterfly = (item) => {
    clearTimeout(timerRef.current);

    setPageLoading(true);
    setImageLoading(false);
    setImageError(false);

    console.log(`Loading butterfly: ${item.name}`);

    timerRef.current = setTimeout(() => {
      setSelected(item);
      setPageLoading(false);
      setImageLoading(Boolean(item.image));
      setImageError(!item.image);

      console.log(
        `Butterfly page loaded successfully: ${item.name}`
      );

      window.scrollTo(0, 0);
    }, 3000);
  };

  const goBack = () => {
    clearTimeout(timerRef.current);
    setSelected(null);
    setPageLoading(false);
    setImageLoading(false);
    setImageError(false);

    console.log("Gallery page loaded successfully");
  };

  const handleGalleryImageError = (id) => {
    console.error(
      `Image failed to load for butterfly ID: ${id}`
    );

    setData((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, image: "" } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <h2>Loading Butterfly Atlas...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container error-page">
        <h1>🦋 Butterfly Atlas</h1>
        <h2 className="error">Unable to load gallery</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <h2>Loading Butterfly...</h2>
        <p>Please wait a moment 🦋</p>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="container">
        <button className="back-btn" onClick={goBack}>
          ← Back to Gallery
        </button>

        <div className="detail-card">
          <h1>{selected.name}</h1>

          <div className="detail-image">
            {imageLoading && (
              <div className="image-message">
                <div className="spinner"></div>
                <p>Loading image...</p>
              </div>
            )}

            {imageError && (
              <div className="no-image">No image found</div>
            )}

            {selected.image && !imageError && (
              <img
                src={selected.image}
                alt={selected.name}
                style={{
                  display: imageLoading ? "none" : "block",
                }}
                onLoad={() => {
                  setImageLoading(false);
                  console.log(
                    `Butterfly image loaded: ${selected.name}`
                  );
                }}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                  console.error(
                    `Image failed: ${selected.name}`
                  );
                }}
              />
            )}
          </div>

          <h2>{selected.name}</h2>

          <p>
            <strong>Scientific Name:</strong>{" "}
            {selected.scientific}
          </p>

          <p>
            <strong>Observations:</strong>{" "}
            {selected.observations}
          </p>

          {selected.custom && (
            <p className="custom-label">Added by you</p>
          )}

          {!selected.custom && selected.attribution && (
            <p className="attribution">
              Photo: {selected.attribution}
            </p>
          )}

          <p>
            <strong>Species ID:</strong> {selected.id}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🦋 Butterfly Atlas</h1>

      <p className="subtitle">
        Discover beautiful butterflies around the world
      </p>

      <section className="add-butterfly-section">
        <h2>Add a New Butterfly</h2>

        <form
          className="butterfly-form"
          onSubmit={handleAddButterfly}
        >
          <label htmlFor="name">Butterfly Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g. Blue Morpho"
            value={form.name}
            onChange={handleFormChange}
            required
          />

          <label htmlFor="scientific">Scientific Name</label>
          <input
            id="scientific"
            name="scientific"
            type="text"
            placeholder="e.g. Morpho menelaus"
            value={form.scientific}
            onChange={handleFormChange}
            required
          />

          <label>Choose Image Method</label>

          <div className="image-options">
            <button
              type="button"
              className={
                imageOption === "url" ? "option-active" : ""
              }
              onClick={() => handleImageOptionChange("url")}
            >
              Image URL
            </button>

            <button
              type="button"
              className={
                imageOption === "upload"
                  ? "option-active"
                  : ""
              }
              onClick={() => handleImageOptionChange("upload")}
            >
              Upload Photo
            </button>
          </div>

          {imageOption === "url" ? (
            <>
              <label htmlFor="image">Image URL</label>
              <input
                id="image"
                name="image"
                type="url"
                placeholder="Paste butterfly image URL"
                value={form.image}
                onChange={handleFormChange}
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="butterflyPhoto">
                Upload Butterfly Photo
              </label>

              <input
                id="butterflyPhoto"
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
              />

              {uploadedImage && (
                <img
                  src={uploadedImage}
                  alt="Butterfly preview"
                  className="upload-preview"
                />
              )}
            </>
          )}

          <label htmlFor="observations">
            Number of Observations
          </label>

          <input
            id="observations"
            name="observations"
            type="number"
            min="0"
            value={form.observations}
            onChange={handleFormChange}
          />

          <button type="submit">+ Add Butterfly</button>

          {formMessage && (
            <p
              className={
                formMessage.includes("added to")
                  ? "form-success"
                  : "form-error"
              }
              role="status"
            >
              {formMessage}
            </p>
          )}
        </form>
      </section>

      <input
        className="search-box"
        type="search"
        placeholder="Search butterflies..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <p className="gallery-count">
        Showing {filteredData.length} butterfly species
      </p>

      {filteredData.length === 0 ? (
        <div className="empty">
          <h3>No butterflies found</h3>
          <p>Try another name or add a new butterfly above.</p>
        </div>
      ) : (
        <>
          <div className="grid">
            {currentData.map((item) => (
              <div
                className="card"
                key={item.id}
                onClick={() => openButterfly(item)}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      e.stopPropagation();
                      handleGalleryImageError(item.id);
                    }}
                  />
                ) : (
                  <div className="no-image">
                    No image found
                  </div>
                )}

                <h3>{item.name}</h3>

                <p className="scientific">
                  {item.scientific}
                </p>

                <p>Observations: {item.observations}</p>

                {item.custom && (
                  <span className="custom-label">
                    Added by you
                  </span>
                )}

                <span className="view-text">
                  View Details →
                </span>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
