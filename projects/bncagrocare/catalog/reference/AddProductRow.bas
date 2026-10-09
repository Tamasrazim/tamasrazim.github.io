Attribute VB_Name = "modBNCInvoice"
Option Explicit

Public Sub AddProductRow()

    Dim ws As Worksheet
    Dim stCell As Range
    Dim stRow As Long
    Dim sigCell As Range
    Dim sigRow As Long
    Dim r As Long
    Dim totalRows As Long
    Dim i As Long

    Set ws = ThisWorkbook.Worksheets("01")

    On Error GoTo CleanFail
    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.CutCopyMode = False

    Set stCell = ws.Columns("B").Find(What:="ST", LookIn:=xlValues, LookAt:=xlWhole)
    If stCell Is Nothing Then Err.Raise vbObjectError + 1, , "ST row not found."
    stRow = stCell.Row

    Set sigCell = ws.Cells.Find(What:="Customer Signature", LookIn:=xlValues, LookAt:=xlPart)
    If sigCell Is Nothing Then Err.Raise vbObjectError + 2, , "Customer Signature row not found."
    sigRow = sigCell.Row

    ' Do NOT use Rows(stRow).Insert.
    ' Move the invoice block down so merged boxes and borders remain intact.
    For r = sigRow To stRow Step -1
        ws.Range("A" & r & ":O" & r).Copy Destination:=ws.Range("A" & (r + 1) & ":O" & (r + 1))
        ws.Rows(r + 1).RowHeight = ws.Rows(r).RowHeight
    Next r

    ' Turn the old ST row into a clean product row.
    ws.Range("A" & stRow & ":O" & stRow).ClearContents
    ws.Range("A" & (stRow - 1) & ":O" & (stRow - 1)).Copy
    ws.Range("A" & stRow & ":O" & stRow).PasteSpecial Paste:=xlPasteFormats
    Application.CutCopyMode = False

    totalRows = stRow - 10

    For i = 0 To totalRows - 1
        ws.Cells(11 + i, "A").Value = i + 1
        ws.Cells(11 + i, "A").NumberFormat = "00"

        ws.Cells(11 + i, "G").Value = totalRows + i + 1
        ws.Cells(11 + i, "G").NumberFormat = "00"
    Next i

CleanExit:
    Application.CutCopyMode = False
    Application.EnableEvents = True
    Application.ScreenUpdating = True
    Exit Sub

CleanFail:
    MsgBox "Add Product Row failed: " & Err.Description, vbCritical
    Resume CleanExit

End Sub
