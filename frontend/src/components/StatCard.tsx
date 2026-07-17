import { Card, CardActionArea, CardContent, Stack, Box, Typography, SvgIconProps } from "@mui/material";
import { ReactElement } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactElement<SvgIconProps>;
  color?: string;
  variant?: "default" | "plain";
  size?: "normal" | "compact";
  onClick?: () => void;
  actionLabel?: string;
}

export function StatCard({ label, value, icon, color = "#525252", variant = "default", size = "normal", onClick, actionLabel }: StatCardProps) {
  const isPlain = variant === "plain";
  const isCompact = size === "compact";

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        minHeight: isCompact ? 96 : 132,
        borderRadius: "8px",
        boxShadow: "0 1px 3px 0 rgb(15 23 42 / 0.1), 0 1px 2px -1px rgb(15 23 42 / 0.1)",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        ...(onClick ? {
          "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 18px -12px rgb(15 23 42 / 0.35), 0 5px 10px -8px rgb(15 23 42 / 0.25)",
          borderColor: "#c6d0dc"
          },
          "&:active": {
            transform: "translateY(-1px) scale(0.99)"
          }
        } : {}),
        "&:focus-within": {
          outline: "3px solid rgb(37 99 235 / 0.18)",
          outlineOffset: "2px"
        },
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isPlain ? 0 : "5px",
          backgroundColor: color,
        }
      }}
    >
      <CardActionArea
        onClick={onClick}
        aria-label={actionLabel ?? `Open ${label}`}
        sx={{
          height: "100%",
          alignItems: "stretch",
          textAlign: "left",
          "& .MuiCardActionArea-focusHighlight": {
            bgcolor: "primary.main",
            opacity: 0.08
          }
        }}
      >
        <CardContent sx={{ height: "100%", py: `${isCompact ? 14 : 22}px !important`, px: isCompact ? 2 : 3 }}>
          <Stack
            direction="row"
            justifyContent={isPlain ? "flex-start" : "space-between"}
            alignItems={isPlain ? "flex-start" : "center"}
            spacing={2}
            sx={{ height: "100%" }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  color: isPlain ? "#3f3f46" : "#26364a",
                  fontWeight: isPlain ? 400 : 600,
                  fontSize: isPlain ? { xs: isCompact ? 16 : 20, md: isCompact ? 18 : 22 } : undefined,
                  lineHeight: 1.3,
                  mb: isPlain ? (isCompact ? 0.5 : 1.2) : 1,
                  overflowWrap: "anywhere"
                }}
              >
                {label}
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontSize: { xs: isCompact ? 30 : 42, md: isCompact ? 34 : 50 },
                  lineHeight: 1,
                  fontWeight: 900,
                  color: isPlain ? "#111" : "#0f172a"
                }}
              >
                {value}
              </Typography>
            </Box>
            {!isPlain && icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                  width: 70,
                  "& svg": {
                    fontSize: 64,
                    color,
                    opacity: 0.9
                  }
                }}
              >
                {icon}
              </Box>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
