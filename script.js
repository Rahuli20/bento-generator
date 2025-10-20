document.addEventListener("DOMContentLoaded", () => {
    const heightInput = document.getElementById("height");
    const widthInput = document.getElementById("width");
    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const bentoGridContainer = document.getElementById("bento-grid-container");
    const downloadSvgBtn = document.getElementById("downloadSvg");
    const resetGridBtn = document.getElementById("resetGrid");
  
    const GAP = 1; // 1px gap between boxes
    let selectedBoxes = []; // Stores the [row, col] of selected boxes
    let mergedAreas = []; // Stores merged areas as { startRow, startCol, endRow, endCol }
  
    // Function to create or update the grid
    function updateGrid() {
      const gridHeight = parseInt(heightInput.value);
      const gridWidth = parseInt(widthInput.value);
      const numRows = parseInt(rowsInput.value);
      const numCols = parseInt(columnsInput.value);
  
      if (
        isNaN(gridHeight) ||
        isNaN(gridWidth) ||
        isNaN(numRows) ||
        isNaN(numCols) ||
        numRows <= 0 ||
        numCols <= 0
      ) {
        bentoGridContainer.innerHTML = "<p>Please enter valid numbers.</p>";
        return;
      }
  
      // Clear previous grid and selections
      bentoGridContainer.innerHTML = "";
      selectedBoxes = [];
      mergedAreas = [];
  
      const grid = document.createElement("div");
      grid.classList.add("bento-grid");
      grid.style.width = `${gridWidth}px`;
      grid.style.height = `${gridHeight}px`;
      grid.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;
      grid.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
  
      // Create a 2D array to represent the grid state
      // Each cell will store a reference to its DOM element and its merged state
      let gridState = Array(numRows)
        .fill(null)
        .map(() =>
          Array(numCols)
            .fill(null)
            .map(() => ({
              element: null,
              merged: false, // true if this cell is part of a larger merged box
              id: null, // ID of the merged box it belongs to
            })),
        );
  
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const box = document.createElement("div");
          box.classList.add("bento-box");
          box.dataset.row = r;
          box.dataset.col = c;
          box.style.gridRow = `${r + 1}`;
          box.style.gridColumn = `${c + 1}`;
          grid.appendChild(box);
          gridState[r][c].element = box;
  
          box.addEventListener("click", () => handleBoxClick(r, c, gridState));
        }
      }
      bentoGridContainer.appendChild(grid);
    }
  
    function handleBoxClick(row, col, gridState) {
      const clickedBox = gridState[row][col].element;
  
      if (gridState[row][col].merged) {
        // If clicking on a merged box part, select the whole merged box
        const mergedId = gridState[row][col].id;
        const mergedArea = mergedAreas.find((area) => area.id === mergedId);
  
        // Clear previous selection
        selectedBoxes.forEach(([r, c]) => {
          gridState[r][c].element.classList.remove("selected");
        });
        selectedBoxes = [];
  
        // Select all boxes within the merged area
        for (let r = mergedArea.startRow; r <= mergedArea.endRow; r++) {
          for (let c = mergedArea.startCol; c <= mergedArea.endCol; c++) {
            gridState[r][c].element.classList.add("selected");
            selectedBoxes.push([r, c]);
          }
        }
        return; // Stop here, merged boxes are now selected
      }
  
      if (clickedBox.classList.contains("selected")) {
        // Deselect if already selected
        clickedBox.classList.remove("selected");
        selectedBoxes = selectedBoxes.filter(
          (box) => !(box[0] === row && box[1] === col),
        );
      } else {
        // Select the box
        clickedBox.classList.add("selected");
        selectedBoxes.push([row, col]);
  
        if (selectedBoxes.length === 2) {
          // Attempt to merge if two boxes are selected
          attemptMerge(gridState);
        } else if (selectedBoxes.length > 2) {
          // If more than two boxes are selected, it means
          // a previously merged box might be selected along with a new one
          // or multiple individual boxes. Re-evaluate for merge.
          attemptMerge(gridState);
        }
      }
    }
  
    function attemptMerge(gridState) {
      if (selectedBoxes.length < 2) return;
  
      // Sort selected boxes to easily determine min/max row/col
      selectedBoxes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  
      const firstBox = selectedBoxes[0];
      const lastBox = selectedBoxes[selectedBoxes.length - 1];
  
      let minRow = Infinity,
        maxRow = -Infinity,
        minCol = Infinity,
        maxCol = -Infinity;
  
      selectedBoxes.forEach(([r, c]) => {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      });
  
      const numSelectedRows = maxRow - minRow + 1;
      const numSelectedCols = maxCol - minCol + 1;
      const expectedBoxCount = numSelectedRows * numSelectedCols;
  
      // Check if the selected boxes already form a perfect rectangle
      let currentSelectionFormsRectangle = true;
      if (selectedBoxes.length === expectedBoxCount) {
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            const isSelected = selectedBoxes.some(
              (box) => box[0] === r && box[1] === c,
            );
            if (!isSelected) {
              currentSelectionFormsRectangle = false;
              break;
            }
          }
          if (!currentSelectionFormsRectangle) break;
        }
      } else {
        currentSelectionFormsRectangle = false;
      }
  
      if (!currentSelectionFormsRectangle) {
        // If the current selection doesn't form a rectangle, it's either an L-shape
        // or disjoint boxes. We need to expand the selection to form a rectangle.
        let newSelectedBoxes = [];
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            newSelectedBoxes.push([r, c]);
          }
        }
        selectedBoxes = newSelectedBoxes; // Update selectedBoxes to form a rectangle
      }
  
      // Now, `selectedBoxes` represents a rectangular area.
      // Check if all boxes in this rectangle are currently unmerged,
      // or if they all belong to the same previously merged area.
      let canMerge = true;
      let firstBoxMergedId = null;
      if (gridState[selectedBoxes[0][0]][selectedBoxes[0][1]].merged) {
        firstBoxMergedId = gridState[selectedBoxes[0][0]][selectedBoxes[0][1]].id;
      }
  
      for (const [r, c] of selectedBoxes) {
        if (gridState[r][c].merged) {
          if (firstBoxMergedId === null) {
            // Attempting to merge an unmerged selection with an already merged one
            canMerge = false;
            break;
          } else if (gridState[r][c].id !== firstBoxMergedId) {
            // Attempting to merge parts of different merged areas or an unmerged area
            canMerge = false;
            break;
          }
        }
      }
  
      if (canMerge) {
        // All selected boxes are either unmerged or belong to the same existing merged area. Proceed with merge.
        const mergedId = firstBoxMergedId || `merged-${Date.now()}`;
  
        // Remove the old merged area if this merge is expanding an existing one
        if (firstBoxMergedId) {
          mergedAreas = mergedAreas.filter((area) => area.id !== firstBoxMergedId);
        }
  
        // Create a new merged area based on the rectangle defined by selectedBoxes
        const newMergedArea = {
          id: mergedId,
          startRow: minRow,
          startCol: minCol,
          endRow: maxRow,
          endCol: maxCol,
        };
        mergedAreas.push(newMergedArea);
  
        applyMergeToDOM(newMergedArea, gridState);
      } else {
        // Cannot merge, deselect all for user to try again
        selectedBoxes.forEach(([r, c]) => {
          gridState[r][c].element.classList.remove("selected");
        });
        selectedBoxes = [];
        alert(
          "Invalid merge. You can only merge contiguous unmerged boxes or expand an existing merged area into a rectangle.",
        );
      }
    }
  
    function applyMergeToDOM(mergedArea, gridState) {
      const numRows = parseInt(rowsInput.value);
      const numCols = parseInt(columnsInput.value);
  
      // Deselect all boxes first
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          gridState[r][c].element.classList.remove("selected");
          gridState[r][c].element.classList.remove("merged-source");
          gridState[r][c].element.style.display = ""; // Reset display
          gridState[r][c].element.style.gridArea = ""; // Reset grid area
          gridState[r][c].element.style.backgroundColor = ""; // Reset background
        }
      }
  
      // Apply styles for the new merged state
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          let isPartOfAnyMergedArea = false;
          let foundMergedArea = null;
  
          for (const area of mergedAreas) {
            if (
              r >= area.startRow &&
              r <= area.endRow &&
              c >= area.startCol &&
              c <= area.endCol
            ) {
              isPartOfAnyMergedArea = true;
              foundMergedArea = area;
              break;
            }
          }
  
          if (isPartOfAnyMergedArea) {
            gridState[r][c].merged = true;
            gridState[r][c].id = foundMergedArea.id;
  
            if (
              r === foundMergedArea.startRow &&
              c === foundMergedArea.startCol
            ) {
              // This is the top-left box of a merged area, make it represent the whole area
              const mergedBox = gridState[r][c].element;
              mergedBox.style.gridArea = `${foundMergedArea.startRow + 1} / ${
                foundMergedArea.startCol + 1
              } / ${foundMergedArea.endRow + 2} / ${
                foundMergedArea.endCol + 2
              }`;
              mergedBox.style.backgroundColor = ""; // Use CSS variable instead
              mergedBox.style.display = "flex"; // Ensure it's visible
              mergedBox.classList.add("selected"); // Keep it selected for visual feedback after merge
            } else {
              // Other boxes within the merged area should be hidden or visually integrated
              gridState[r][c].element.style.display = "none"; // Hide other parts of the merged block
            }
          } else {
            // This box is not part of any merged area
            gridState[r][c].merged = false;
            gridState[r][c].id = null;
            gridState[r][c].element.style.display = "flex"; // Ensure unmerged boxes are visible
            gridState[r][c].element.style.backgroundColor = ""; // Use CSS variable instead
          }
        }
      }
      selectedBoxes = []; // Clear selection after merge
    }
  
    function resetGrid() {
      // Clear all selections and merged areas
      selectedBoxes = [];
      mergedAreas = [];
      
      // Regenerate the grid with current settings
      updateGrid();
    }

    function downloadSvg() {
      const gridHeight = parseInt(heightInput.value);
      const gridWidth = parseInt(widthInput.value);
      const numRows = parseInt(rowsInput.value);
      const numCols = parseInt(columnsInput.value);
      const boxRadius = 30; // From CSS .bento-box border-radius
  
      let svgContent = `<svg width="${gridWidth}" height="${gridHeight}" viewBox="0 0 ${gridWidth} ${gridHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">`;
  
      // Calculate base box dimensions (before gaps are applied by SVG positioning)
      const baseBoxWidth = (gridWidth - (numCols - 1) * GAP) / numCols;
      const baseBoxHeight = (gridHeight - (numRows - 1) * GAP) / numRows;
  
      // We need to keep track of which cells are part of a merged box
      // to avoid drawing individual boxes that are now covered by a merged one.
      let occupiedCells = Array(numRows)
        .fill(null)
        .map(() => Array(numCols).fill(false));
  
      // First, draw the merged boxes
      for (const area of mergedAreas) {
        const mergedBoxWidth =
          area.endCol - area.startCol + 1;
        const mergedBoxHeight =
          area.endRow - area.startRow + 1;
  
        const x = area.startCol * (baseBoxWidth + GAP);
        const y = area.startRow * (baseBoxHeight + GAP);
        const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * GAP;
        const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * GAP;
  
        svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${boxRadius}" ry="${boxRadius}" fill="#daff06"/>`;
  
        // Mark these cells as occupied
        for (let r = area.startRow; r <= area.endRow; r++) {
          for (let c = area.startCol; c <= area.endCol; c++) {
            occupiedCells[r][c] = true;
          }
        }
      }
  
      // Then, draw the individual unmerged boxes
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (!occupiedCells[r][c]) {
            const x = c * (baseBoxWidth + GAP);
            const y = r * (baseBoxHeight + GAP);
            svgContent += `<rect x="${x}" y="${y}" width="${baseBoxWidth}" height="${baseBoxHeight}" rx="${boxRadius}" ry="${boxRadius}" fill="#daff06"/>`;
          }
        }
      }
  
      svgContent += `</svg>`;
  
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bento-grid.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    // Event Listeners for input changes
    heightInput.addEventListener("change", updateGrid);
    widthInput.addEventListener("change", updateGrid);
    rowsInput.addEventListener("change", updateGrid);
    columnsInput.addEventListener("change", updateGrid);
    downloadSvgBtn.addEventListener("click", downloadSvg);
    resetGridBtn.addEventListener("click", resetGrid);
  
    // Initial grid generation
    updateGrid();
  });