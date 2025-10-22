document.addEventListener("DOMContentLoaded", () => {
    const heightInput = document.getElementById("height");
    const widthInput = document.getElementById("width");
    const rowsInput = document.getElementById("rows");
    const columnsInput = document.getElementById("columns");
    const bentoGridContainer = document.getElementById("bento-grid-container");
    const copySvgBtn = document.getElementById("copySvg");
    const resetGridBtn = document.getElementById("resetGrid");
    
    console.log("Reset button element:", resetGridBtn); // Debug log
  
    const removeGapCheckbox = document.getElementById("removeGap");
    const addStrokeCheckbox = document.getElementById("addStroke");
    const addSafeAreaCheckbox = document.getElementById("addSafeArea");
    let selectedBoxes = []; // Stores the [row, col] of selected boxes
    let mergedAreas = []; // Stores merged areas as { startRow, startCol, endRow, endCol }

    // Function to calculate border radius based on shortest side of grid
    function calculateBorderRadius(gridHeight, gridWidth) {
      const shortestSide = Math.min(gridHeight, gridWidth);
      
      if (shortestSide < 250) return 8;
      if (shortestSide >= 250 && shortestSide < 500) return 16;
      if (shortestSide >= 500 && shortestSide < 750) return 20;
      return 20; // >= 750px
    }

    // Function to calculate gap based on shortest side of grid
    function calculateGap(gridHeight, gridWidth) {
      if (removeGapCheckbox.checked) return 0;
      
      const shortestSide = Math.min(gridHeight, gridWidth);
      
      if (shortestSide < 250) return 1;
      if (shortestSide >= 250 && shortestSide < 500) return 2;
      if (shortestSide >= 500 && shortestSide < 750) return 4;
      return 6; // >= 750px
    }

    // Function to calculate scale factor to fit within 80vw/75vh
    function calculateResponsiveScale(gridHeight, gridWidth) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate available space (80% width, 75% height to match CSS)
      const availableWidth = viewportWidth * 0.8;
      const availableHeight = viewportHeight * 0.75;
      
      // Calculate scale factors for both dimensions (like object-fit: contain)
      const scaleX = availableWidth / gridWidth;
      const scaleY = availableHeight / gridHeight;
      
      // Debug logging
      console.log('Scaling Debug:', {
        viewport: { width: viewportWidth, height: viewportHeight },
        available: { width: availableWidth, height: availableHeight },
        grid: { width: gridWidth, height: gridHeight },
        scales: { scaleX, scaleY },
        finalScale: Math.min(scaleX, scaleY, 1)
      });
      
      // Use the smaller scale factor to ensure the entire grid fits
      const scaleFactor = Math.min(scaleX, scaleY, 1); // Never scale up
      
      return Math.max(scaleFactor, 0.1); // Minimum scale of 10%
    }
  
    // Function to update visual properties without resetting grid state
    function updateVisualProperties() {
      const gridHeight = parseInt(heightInput.value);
      const gridWidth = parseInt(widthInput.value);
      
      if (isNaN(gridHeight) || isNaN(gridWidth)) {
        return;
      }

      // Calculate dynamic values
      const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
      const gap = calculateGap(gridHeight, gridWidth);
      const scaleFactor = calculateResponsiveScale(gridHeight, gridWidth);

      // Update the existing grid container
      const existingGrid = bentoGridContainer.querySelector('.bento-grid');
      if (existingGrid) {
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        
        // Calculate exact cell dimensions
        const cellWidth = (gridWidth - (numCols - 1) * gap) / numCols;
        const cellHeight = (gridHeight - (numRows - 1) * gap) / numRows;
        
        // Set the actual dimensions (for export)
        existingGrid.style.width = `${gridWidth}px`;
        existingGrid.style.height = `${gridHeight}px`;
        existingGrid.style.gridTemplateRows = `repeat(${numRows}, ${cellHeight}px)`;
        existingGrid.style.gridTemplateColumns = `repeat(${numCols}, ${cellWidth}px)`;
        existingGrid.style.gap = `${gap}px`;

        // Apply responsive scaling
        existingGrid.style.transform = `scale(${scaleFactor})`;
        existingGrid.style.transformOrigin = 'center center';

        // Update border radius and stroke for all boxes
        const boxes = existingGrid.querySelectorAll('.bento-box');
        boxes.forEach(box => {
          box.style.borderRadius = `${borderRadius}px`;
          if (addStrokeCheckbox.checked) {
            box.style.border = '1px solid black';
          } else {
            box.style.border = 'none';
          }
        });

        // Update safe area overlays
        updateSafeAreaOverlays();
      }
    }

    // Function to update safe area overlays in the preview
    function updateSafeAreaOverlays() {
      // Remove existing safe area overlays
      const existingOverlays = bentoGridContainer.querySelectorAll('.safe-area-overlay');
      existingOverlays.forEach(overlay => overlay.remove());

      if (!addSafeAreaCheckbox.checked) {
        return;
      }

      const existingGrid = bentoGridContainer.querySelector('.bento-grid');
      if (!existingGrid) return;

      const gridHeight = parseInt(heightInput.value);
      const gridWidth = parseInt(widthInput.value);
      const numRows = parseInt(rowsInput.value);
      const numCols = parseInt(columnsInput.value);
      const gap = calculateGap(gridHeight, gridWidth);
      const safeAreaInset = 15; // Fixed 10px inset

      // Calculate base box dimensions
      const baseBoxWidth = (gridWidth - (numCols - 1) * gap) / numCols;
      const baseBoxHeight = (gridHeight - (numRows - 1) * gap) / numRows;

      // Create safe area overlays for each visible box
      const boxes = existingGrid.querySelectorAll('.bento-box');
      boxes.forEach(box => {
        const row = parseInt(box.dataset.row);
        const col = parseInt(box.dataset.col);
        
        // Check if this box is part of a merged area
        let isPartOfMergedArea = false;
        let mergedArea = null;
        
        for (const area of mergedAreas) {
          if (row >= area.startRow && row <= area.endRow && 
              col >= area.startCol && col <= area.endCol) {
            isPartOfMergedArea = true;
            mergedArea = area;
            break;
          }
        }

        // Only create safe area for the top-left box of merged areas or individual boxes
        if (isPartOfMergedArea) {
          if (row !== mergedArea.startRow || col !== mergedArea.startCol) {
            return; // Skip non-top-left boxes of merged areas
          }
          
          // Calculate merged box dimensions
          const mergedBoxWidth = mergedArea.endCol - mergedArea.startCol + 1;
          const mergedBoxHeight = mergedArea.endRow - mergedArea.startRow + 1;
          
          const x = mergedArea.startCol * (baseBoxWidth + gap);
          const y = mergedArea.startRow * (baseBoxHeight + gap);
          const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
          const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;
          
          // Calculate safe area dimensions
          const safeWidth = Math.max(0, width - (safeAreaInset * 2));
          const safeHeight = Math.max(0, height - (safeAreaInset * 2));
          
          if (safeWidth > 0 && safeHeight > 0) {
            const safeAreaOverlay = document.createElement('div');
            safeAreaOverlay.classList.add('safe-area-overlay');
            safeAreaOverlay.style.position = 'absolute';
            safeAreaOverlay.style.left = `${x + safeAreaInset}px`;
            safeAreaOverlay.style.top = `${y + safeAreaInset}px`;
            safeAreaOverlay.style.width = `${safeWidth}px`;
            safeAreaOverlay.style.height = `${safeHeight}px`;
            safeAreaOverlay.style.border = '1px solid black';
            safeAreaOverlay.style.backgroundColor = 'transparent';
            safeAreaOverlay.style.pointerEvents = 'none';
            safeAreaOverlay.style.zIndex = '10';
            
            existingGrid.appendChild(safeAreaOverlay);
          }
        } else {
          // Individual box
          const x = col * (baseBoxWidth + gap);
          const y = row * (baseBoxHeight + gap);
          
          // Calculate safe area dimensions
          const safeWidth = Math.max(0, baseBoxWidth - (safeAreaInset * 2));
          const safeHeight = Math.max(0, baseBoxHeight - (safeAreaInset * 2));
          
          if (safeWidth > 0 && safeHeight > 0) {
            const safeAreaOverlay = document.createElement('div');
            safeAreaOverlay.classList.add('safe-area-overlay');
            safeAreaOverlay.style.position = 'absolute';
            safeAreaOverlay.style.left = `${x + safeAreaInset}px`;
            safeAreaOverlay.style.top = `${y + safeAreaInset}px`;
            safeAreaOverlay.style.width = `${safeWidth}px`;
            safeAreaOverlay.style.height = `${safeHeight}px`;
            safeAreaOverlay.style.border = '1px solid black';
            safeAreaOverlay.style.backgroundColor = 'transparent';
            safeAreaOverlay.style.pointerEvents = 'none';
            safeAreaOverlay.style.zIndex = '10';
            
            existingGrid.appendChild(safeAreaOverlay);
          }
        }
      });
    }

    // Function to create or update the grid
    function updateGrid() {
      console.log("updateGrid called"); // Debug log
      
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

      // Calculate dynamic values
      const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
      const gap = calculateGap(gridHeight, gridWidth);
      const scaleFactor = calculateResponsiveScale(gridHeight, gridWidth);

      // Clear previous grid, selections, and safe area overlays
      bentoGridContainer.innerHTML = "";
      selectedBoxes = [];
      mergedAreas = [];

      const grid = document.createElement("div");
      grid.classList.add("bento-grid");
      
      // Calculate exact cell dimensions
      const cellWidth = (gridWidth - (numCols - 1) * gap) / numCols;
      const cellHeight = (gridHeight - (numRows - 1) * gap) / numRows;
      
      // Set the actual dimensions (for export)
      grid.style.width = `${gridWidth}px`;
      grid.style.height = `${gridHeight}px`;
      grid.style.gridTemplateRows = `repeat(${numRows}, ${cellHeight}px)`;
      grid.style.gridTemplateColumns = `repeat(${numCols}, ${cellWidth}px)`;
      grid.style.gap = `${gap}px`;

      // Apply responsive scaling
      grid.style.transform = `scale(${scaleFactor})`;
      grid.style.transformOrigin = 'center center';

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
          box.style.borderRadius = `${borderRadius}px`;
          if (addStrokeCheckbox.checked) {
            box.style.border = '1px solid black';
          } else {
            box.style.border = 'none';
          }
          grid.appendChild(box);
          gridState[r][c].element = box;

          box.addEventListener("click", () => handleBoxClick(r, c, gridState));
        }
      }
      bentoGridContainer.appendChild(grid);
      
      // Update safe area overlays after grid creation
      updateSafeAreaOverlays();
    }
  
    function handleBoxClick(row, col, gridState) {
      const clickedBox = gridState[row][col].element;
  
      if (gridState[row][col].merged) {
        // If clicking on a merged box part, select the whole merged box
        const mergedId = gridState[row][col].id;
        const mergedArea = mergedAreas.find((area) => area.id === mergedId);

        // Check if this merged area is already selected
        const isAlreadySelected = selectedBoxes.length > 0 && 
          selectedBoxes.every(([r, c]) => 
            r >= mergedArea.startRow && r <= mergedArea.endRow &&
            c >= mergedArea.startCol && c <= mergedArea.endCol
          ) &&
          selectedBoxes.length === (mergedArea.endRow - mergedArea.startRow + 1) * (mergedArea.endCol - mergedArea.startCol + 1);

        if (isAlreadySelected) {
          // Deselect the merged area
          selectedBoxes.forEach(([r, c]) => {
            gridState[r][c].element.classList.remove("selected");
          });
          selectedBoxes = [];
        } else {
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
        }
        return; // Stop here, merged boxes are now selected or deselected
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
              // Remove selected class - no visual feedback after merge
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
      
      // Update safe area overlays after merge
      updateSafeAreaOverlays();
    }
  
    function resetGrid() {
      console.log("Reset button clicked"); // Debug log
      
      // Reset input values to defaults
      heightInput.value = 390;
      widthInput.value = 960;
      rowsInput.value = 2;
      columnsInput.value = 3;
      removeGapCheckbox.checked = false;
      addStrokeCheckbox.checked = false;
      addSafeAreaCheckbox.checked = false;
      
      // Clear all selections and merged areas
      selectedBoxes = [];
      mergedAreas = [];
      
      // Regenerate the grid with default settings
      updateGrid();
      
      console.log("Grid reset complete"); // Debug log
    }

    function copySvg() {
      const gridHeight = parseInt(heightInput.value);
      const gridWidth = parseInt(widthInput.value);
      const numRows = parseInt(rowsInput.value);
      const numCols = parseInt(columnsInput.value);
      const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
      const gap = calculateGap(gridHeight, gridWidth);
      const strokeColor = addStrokeCheckbox.checked ? 'black' : 'none';
      const strokeWidth = addStrokeCheckbox.checked ? '1' : '0';
      
      // Add padding for stroke to prevent clipping
      const strokePadding = addStrokeCheckbox.checked ? 2 : 0; // 1px stroke + 1px padding
      const svgWidth = gridWidth + strokePadding * 2;
      const svgHeight = gridHeight + strokePadding * 2;
      const offsetX = strokePadding;
      const offsetY = strokePadding;

      let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">`;

      // Calculate base box dimensions (before gaps are applied by SVG positioning)
      const baseBoxWidth = (gridWidth - (numCols - 1) * gap) / numCols;
      const baseBoxHeight = (gridHeight - (numRows - 1) * gap) / numRows;
  
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
  
        const x = area.startCol * (baseBoxWidth + gap) + offsetX;
        const y = area.startRow * (baseBoxHeight + gap) + offsetY;
        const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
        const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;

        svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="#daff06" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
  
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
            const x = c * (baseBoxWidth + gap) + offsetX;
            const y = r * (baseBoxHeight + gap) + offsetY;
            svgContent += `<rect x="${x}" y="${y}" width="${baseBoxWidth}" height="${baseBoxHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#daff06" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
          }
        }
      }
  
      // Add safe area overlay if enabled
      if (addSafeAreaCheckbox.checked) {
        svgContent += `<g id="safe-area-overlay">`;
        
        const safeAreaInset = 15; // Fixed 80px inset
        
        // Add safe areas for merged boxes
        for (const area of mergedAreas) {
          const mergedBoxWidth = area.endCol - area.startCol + 1;
          const mergedBoxHeight = area.endRow - area.startRow + 1;
  
          const x = area.startCol * (baseBoxWidth + gap) + offsetX;
          const y = area.startRow * (baseBoxHeight + gap) + offsetY;
          const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
          const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;
          
          // Calculate safe area with fixed inset
          const safeX = x + safeAreaInset;
          const safeY = y + safeAreaInset;
          const safeWidth = Math.max(0, width - (safeAreaInset * 2));
          const safeHeight = Math.max(0, height - (safeAreaInset * 2));
          
          // Only add safe area if it's large enough
          if (safeWidth > 0 && safeHeight > 0) {
            svgContent += `<rect x="${safeX}" y="${safeY}" width="${safeWidth}" height="${safeHeight}" fill="none" stroke="#ff0000" stroke-width="1"/>`;
          }
        }
        
        // Add safe areas for individual unmerged boxes
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (!occupiedCells[r][c]) {
              const x = c * (baseBoxWidth + gap) + offsetX;
              const y = r * (baseBoxHeight + gap) + offsetY;
              
              // Calculate safe area with fixed inset
              const safeX = x + safeAreaInset;
              const safeY = y + safeAreaInset;
              const safeWidth = Math.max(0, baseBoxWidth - (safeAreaInset * 2));
              const safeHeight = Math.max(0, baseBoxHeight - (safeAreaInset * 2));
              
              // Only add safe area if it's large enough
              if (safeWidth > 0 && safeHeight > 0) {
                svgContent += `<rect x="${safeX}" y="${safeY}" width="${safeWidth}" height="${safeHeight}" fill="none" stroke="#ff0000" stroke-width="1"/>`;
              }
            }
          }
        }
        
        svgContent += `</g>`;
      }
  
      svgContent += `</svg>`;
  
      // Copy to clipboard
      navigator.clipboard.writeText(svgContent).then(() => {
        // Provide visual feedback
        const originalText = copySvgBtn.textContent;
        copySvgBtn.textContent = "Copied!";
        copySvgBtn.style.backgroundColor = "#28a745";
        
        setTimeout(() => {
          copySvgBtn.textContent = originalText;
          copySvgBtn.style.backgroundColor = "";
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy SVG: ', err);
        alert('Failed to copy SVG to clipboard');
      });
    }
  
    // Event Listeners for input changes
    heightInput.addEventListener("change", updateVisualProperties);
    widthInput.addEventListener("change", updateVisualProperties);
    rowsInput.addEventListener("change", updateGrid); // Rows/columns require full grid reset
    columnsInput.addEventListener("change", updateGrid); // Rows/columns require full grid reset
    removeGapCheckbox.addEventListener("change", updateVisualProperties);
    addStrokeCheckbox.addEventListener("change", updateVisualProperties);
    addSafeAreaCheckbox.addEventListener("change", updateVisualProperties);
    copySvgBtn.addEventListener("click", copySvg);
    resetGridBtn.addEventListener("click", resetGrid);
    
    console.log("Event listeners attached"); // Debug log
    
    // Add window resize listener for responsive scaling
    window.addEventListener('resize', () => {
      updateVisualProperties();
    });
  
    // Initial grid generation
    updateGrid();
  });